import { db } from "@/db";
import { nanoid } from "nanoid";
import { logger } from "@/utils/logger";
import { clearCart } from "@/services/user.service";
import { dbErrorHandlers } from "@/utils/database-errors";
import { createNotFoundError, createValidationError } from "@/utils/errors";
import { eq, and, gte, lte, desc, asc, sql, count, inArray } from "drizzle-orm";
import { orders, orderItems, orderStatusHistory, products, users, shippingAddresses } from "@/db/schema";
import type {
  OrderWithRelations,
  CreateOrderRequest,
  CreateOrderItem,
  UpdateOrderStatusRequest,
  ConfirmPaymentRequest,
  OrderFilters,
  OrderCalculation,
  InventoryCheckResult,
  OrderValidationResult,
} from "@/types/order.types";

// ============================================================================
// Modern Inventory Management Helper Functions
// ============================================================================

type TransactionType = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Safely update inventory with row-level locking and validation
 * Modern best practice: Atomic operations with pessimistic locking
 */
const updateInventorySafely = async (
  tx: TransactionType,
  productId: string,
  quantityChange: number, // positive to increase, negative to decrease
  operation: "decrease" | "increase"
) => {
  // Get current product state with row-level locking (FOR UPDATE)
  const [currentProduct] = await tx
    .select({
      id: products.id,
      name: products.name,
      inventoryQuantity: products.inventoryQuantity,
      allowBackorder: products.allowBackorder,
      status: products.status,
    })
    .from(products)
    .where(eq(products.id, productId))
    .for("update"); // Pessimistic locking to prevent race conditions

  if (!currentProduct) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  if (currentProduct.status !== "active") {
    throw new Error(`Product "${currentProduct.name}" is not active and cannot be processed`);
  }

  const currentInventory = currentProduct.inventoryQuantity ?? 0;
  const newInventory = currentInventory + quantityChange;

  // Validate the operation based on business rules
  if (operation === "decrease" && newInventory < 0 && !currentProduct.allowBackorder) {
    throw new Error(
      `Insufficient inventory for product "${currentProduct.name}". ` +
        `Available: ${currentInventory}, Required: ${Math.abs(quantityChange)}, ` +
        `Backorder allowed: ${currentProduct.allowBackorder}`
    );
  }

  // Perform the inventory update
  await tx
    .update(products)
    .set({
      inventoryQuantity: newInventory,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  return {
    productId,
    productName: currentProduct.name,
    previousQuantity: currentInventory,
    newQuantity: newInventory,
    quantityChange,
  };
};

/**
 * Determine if order status change should restore inventory
 * Modern best practice: Explicit status mapping for inventory management
 */
const shouldRestoreInventoryForStatusChange = (fromStatus: string, toStatus: string): boolean => {
  // Statuses that should restore inventory back to available stock
  const inventoryRestoringStatuses = ["cancelled", "returned", "refunded"];

  // Only restore inventory if:
  // 1. Moving TO a status that restores inventory
  // 2. NOT already in a status that has restored inventory
  return inventoryRestoringStatuses.includes(toStatus) && !inventoryRestoringStatuses.includes(fromStatus);
};

// ============================================================================
// Order Number Generation
// ============================================================================

/**
 * Generate a unique human-readable order number
 * @returns Promise resolving to unique order number
 */
const generateOrderNumber = async (): Promise<string> => {
  const timestamp = Date.now().toString().slice(-8);
  const random = nanoid(4).toUpperCase();
  const orderNumber = `ORD-${timestamp}-${random}`;

  // Ensure uniqueness
  const existing = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (existing.length > 0) {
    // Recursive call with slight delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 1));
    return generateOrderNumber();
  }

  return orderNumber;
};

// ============================================================================
// Order Validation Functions
// ============================================================================

/**
 * Validate order request data
 * @param orderData - Order creation request data
 * @returns Promise resolving to validation result
 */
export const validateOrderRequest = async (orderData: CreateOrderRequest): Promise<OrderValidationResult> => {
  const errors: { field: string; message: string }[] = [];

  try {
    // Validate user exists
    const userExists = await db.select({ id: users.id }).from(users).where(eq(users.id, orderData.userId)).limit(1);

    if (userExists.length === 0) {
      errors.push({ field: "userId", message: "User not found" });
    }

    // Validate shipping address exists and belongs to user
    const shippingAddress = await db
      .select()
      .from(shippingAddresses)
      .where(and(eq(shippingAddresses.id, orderData.shippingAddressId), eq(shippingAddresses.userId, orderData.userId)))
      .limit(1);

    if (shippingAddress.length === 0) {
      errors.push({
        field: "shippingAddressId",
        message: "Shipping address not found or does not belong to user",
      });
    }

    // Validate order items
    if (!orderData.orderItems || orderData.orderItems.length === 0) {
      errors.push({ field: "orderItems", message: "At least one order item is required" });
    } else {
      // Check inventory and product validity
      const inventoryCheck = await checkInventoryAvailability(orderData.orderItems);

      if (!inventoryCheck.isValid) {
        errors.push({
          field: "orderItems",
          message: "Some items are not available in requested quantities",
        });

        return {
          isValid: false,
          errors,
          inventoryCheck,
        };
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    logger.error("Order validation failed", error as Error, { userId: orderData.userId });
    throw new Error("Failed to validate order");
  }
};

/**
 * Check inventory availability for order items
 * @param orderItems - Array of order items to check
 * @returns Promise resolving to inventory check result
 */
export const checkInventoryAvailability = async (orderItems: CreateOrderItem[]): Promise<InventoryCheckResult> => {
  try {
    const productIds = orderItems.map((item) => item.productId);
    const productData = await db
      .select({
        id: products.id,
        name: products.name,
        inventoryQuantity: products.inventoryQuantity,
        allowBackorder: products.allowBackorder,
        status: products.status,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    const productMap = new Map(productData.map((p) => [p.id, p]));
    const insufficientItems: InventoryCheckResult["insufficientItems"] = [];

    for (const item of orderItems) {
      const product = productMap.get(item.productId);

      if (!product) {
        insufficientItems.push({
          productId: item.productId,
          productName: "Unknown Product",
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          allowBackorder: false,
        });
        continue;
      }

      // Check if product is active
      if (product.status !== "active") {
        insufficientItems.push({
          productId: item.productId,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          allowBackorder: false,
        });
        continue;
      }

      // Check inventory
      const available = product.inventoryQuantity ?? 0;
      if (item.quantity > available && !product.allowBackorder) {
        insufficientItems.push({
          productId: item.productId,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableQuantity: available,
          allowBackorder: product.allowBackorder,
        });
      }
    }

    return {
      isValid: insufficientItems.length === 0,
      insufficientItems,
    };
  } catch (error) {
    logger.error("Inventory check failed", error as Error);
    throw new Error("Failed to check inventory availability");
  }
};

// ============================================================================
// Order Calculation Functions
// ============================================================================

/**
 * Calculate order totals (subtotal, tax, shipping, total)
 * @param orderItems - Array of order items
 * @param shippingMethod - Selected shipping method
 * @returns Promise resolving to order calculation
 */
export const calculateOrderTotals = async (
  orderItems: CreateOrderItem[],
  shippingMethod: "standard" | "express" | "free_shipping" = "standard"
): Promise<OrderCalculation> => {
  try {
    const productIds = orderItems.map((item) => item.productId);
    const productData = await db
      .select({
        id: products.id,
        price: products.price,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    const productPriceMap = new Map(productData.map((p) => [p.id, parseFloat(p.price)]));

    // Calculate subtotal
    let subtotal = 0;
    for (const item of orderItems) {
      const price = productPriceMap.get(item.productId) ?? 0;
      subtotal += price * item.quantity;
    }

    // Calculate shipping (simplified logic - can be enhanced with real shipping APIs)
    let shippingAmount = 0;
    switch (shippingMethod) {
      case "standard":
        shippingAmount = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
        break;
      case "express":
        shippingAmount = 19.99;
        break;
      case "free_shipping":
        shippingAmount = 0;
        break;
    }

    // Calculate tax (simplified 8.5% - should be based on shipping address)
    const taxRate = 0.085;
    const taxAmount = subtotal * taxRate;

    const totalAmount = subtotal + taxAmount + shippingAmount;

    return {
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      shippingAmount: shippingAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    };
  } catch (error) {
    logger.error("Order calculation failed", error as Error);
    throw new Error("Failed to calculate order totals");
  }
};

// ============================================================================
// Order CRUD Operations
// ============================================================================

/**
 * Create a new order with validation and inventory checks
 * @param orderData - Order creation request data
 * @returns Promise resolving to created order with relations
 */
export const createOrder = async (orderData: CreateOrderRequest): Promise<OrderWithRelations> => {
  return dbErrorHandlers.create(async () => {
    // Validate the order request
    const validation = await validateOrderRequest(orderData);
    if (!validation.isValid) {
      throw createValidationError(validation.errors);
    }

    // Calculate order totals
    const calculations = await calculateOrderTotals(orderData.orderItems, orderData.shippingMethod);

    // Generate unique order number
    const orderNumber = await generateOrderNumber();

    const orderIdResult = await db.transaction(async (tx) => {
      // Create the order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId: orderData.userId,
          status: orderData.paymentConfirmed ? "confirmed" : "pending",
          paymentConfirmed: orderData.paymentConfirmed,
          subtotal: calculations.subtotal,
          taxAmount: calculations.taxAmount,
          shippingAmount: calculations.shippingAmount,
          totalAmount: calculations.totalAmount,
          shippingMethod: orderData.shippingMethod ?? "standard",
          shippingAddressId: orderData.shippingAddressId,
          customerNotes: orderData.customerNotes,
          metadata: orderData.metadata ?? {},
        })
        .returning();

      // Get product details for order items
      const productIds = orderData.orderItems.map((item) => item.productId);
      const productDetails = await tx
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          weight: products.weight,
          weightUnit: products.weightUnit,
          inventoryQuantity: products.inventoryQuantity,
        })
        .from(products)
        .where(inArray(products.id, productIds));

      const productMap = new Map(productDetails.map((p) => [p.id, p]));

      // Create order items
      const orderItemsData = orderData.orderItems.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw createNotFoundError(`Product ${item.productId}`);
        }

        const unitPrice = parseFloat(product.price);
        const totalPrice = unitPrice * item.quantity;

        return {
          orderId: newOrder.id,
          productId: item.productId,
          productName: product.name,
          productSlug: product.slug,
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
          productVariant: item.productVariant,
          weight: product.weight,
          weightUnit: product.weightUnit ?? "kg",
        };
      });

      await tx.insert(orderItems).values(orderItemsData);

      // Create initial status history entry
      await tx.insert(orderStatusHistory).values({
        orderId: newOrder.id,
        previousStatus: null,
        newStatus: orderData.paymentConfirmed ? "confirmed" : "pending",
        comment: orderData.paymentConfirmed ? "Order created with payment confirmed" : "Order created",
        changedBy: orderData.userId,
        isCustomerVisible: true,
      });

      // Re-validate inventory availability right before order creation (prevents race conditions)
      const finalInventoryCheck = await checkInventoryAvailability(orderData.orderItems);
      if (!finalInventoryCheck.isValid) {
        throw new Error(
          `Final inventory validation failed: ${finalInventoryCheck.insufficientItems
            .map((item) => `${item.productName} (requested: ${item.requestedQuantity}, available: ${item.availableQuantity})`)
            .join(", ")}`
        );
      }

      // Update inventory quantities using modern safe inventory management
      const inventoryUpdates = [];
      for (const item of orderData.orderItems) {
        const product = productMap.get(item.productId);
        if (product && product.inventoryQuantity !== null) {
          const updateResult = await updateInventorySafely(tx, item.productId, -item.quantity, "decrease");
          inventoryUpdates.push(updateResult);
        }
      }

      await clearCart(orderData.userId);

      // Return the order ID, we'll fetch the full order after the transaction
      return newOrder.id;
    });

    // After transaction is committed, fetch and return the complete order
    const createdOrder = await getOrderById(orderIdResult);
    if (!createdOrder) {
      throw new Error("Failed to retrieve created order");
    }
    return createdOrder;
  });
};

/**
 * Get order by ID with full relations
 * @param orderId - Order ID to retrieve
 * @returns Promise resolving to order with relations or null
 */
export const getOrderById = async (orderId: string): Promise<OrderWithRelations | null> => {
  try {
    const result = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        shippingAddress: true,
        orderItems: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                slug: true,
                price: true,
                status: true,
                inventoryQuantity: true,
                allowBackorder: true,
              },
            },
          },
        },
        statusHistory: {
          with: {
            changedBy: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: desc(orderStatusHistory.createdAt),
        },
      },
    });

    return result as OrderWithRelations | null;
  } catch (error) {
    logger.error("Failed to get order by ID", error as Error);
    throw new Error("Failed to retrieve order");
  }
};

/**
 * Get order by order number with full relations
 * @param orderNumber - Order number to retrieve
 * @returns Promise resolving to order with relations or null
 */
export const getOrderByNumber = async (orderNumber: string): Promise<OrderWithRelations | null> => {
  try {
    const result = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        shippingAddress: true,
        orderItems: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                slug: true,
                price: true,
                status: true,
                inventoryQuantity: true,
                allowBackorder: true,
              },
            },
          },
        },
        statusHistory: {
          with: {
            changedBy: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: desc(orderStatusHistory.createdAt),
        },
      },
    });

    return (result as OrderWithRelations) ?? null;
  } catch (error) {
    logger.error("Failed to get order by number", error as Error);
    throw new Error("Failed to retrieve order");
  }
};

/**
 * Get orders with filtering, sorting, and pagination
 * @param filters - Order filtering options
 * @returns Promise resolving to paginated orders result
 */
export const getOrders = async (filters: OrderFilters = {}) => {
  try {
    const {
      userId,
      status,
      orderNumber,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      shippingMethod,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = filters;

    // Build where conditions
    const conditions = [];

    if (userId) {
      conditions.push(eq(orders.userId, userId));
    }

    if (status) {
      conditions.push(eq(orders.status, status));
    }

    if (orderNumber) {
      conditions.push(eq(orders.orderNumber, orderNumber));
    }

    if (dateFrom) {
      conditions.push(gte(orders.createdAt, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(orders.createdAt, dateTo));
    }

    if (minAmount) {
      conditions.push(gte(orders.totalAmount, minAmount));
    }

    if (maxAmount) {
      conditions.push(lte(orders.totalAmount, maxAmount));
    }

    if (shippingMethod) {
      conditions.push(eq(orders.shippingMethod, shippingMethod));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const [{ count: totalCount }] = await db.select({ count: count() }).from(orders).where(whereClause);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);

    // Determine sort order
    let orderByClause;
    switch (sortBy) {
      case "createdAt":
        orderByClause = sortOrder === "asc" ? asc(orders.createdAt) : desc(orders.createdAt);
        break;
      case "updatedAt":
        orderByClause = sortOrder === "asc" ? asc(orders.updatedAt) : desc(orders.updatedAt);
        break;
      case "totalAmount":
        orderByClause = sortOrder === "asc" ? asc(orders.totalAmount) : desc(orders.totalAmount);
        break;
      case "orderNumber":
        orderByClause = sortOrder === "asc" ? asc(orders.orderNumber) : desc(orders.orderNumber);
        break;
      default:
        orderByClause = desc(orders.createdAt);
    }

    // Get orders with relations
    const ordersData = await db.query.orders.findMany({
      where: whereClause,
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        shippingAddress: true,
        orderItems: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                slug: true,
                price: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: orderByClause,
      limit,
      offset,
    });

    return {
      orders: ordersData,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    logger.error("Failed to get orders", error as Error, filters);
    throw new Error("Failed to retrieve orders");
  }
};

// ============================================================================
// Order Status Management
// ============================================================================

/**
 * Update order status with validation and history tracking
 * @param updateData - Order status update data
 * @returns Promise resolving to updated order
 */
export const updateOrderStatus = async (updateData: UpdateOrderStatusRequest): Promise<OrderWithRelations> => {
  return dbErrorHandlers.update(async () => {
    const { orderId, newStatus, comment, changedBy, isCustomerVisible = true } = updateData;

    // Get current order
    const currentOrder = await getOrderById(orderId);
    if (!currentOrder) {
      throw createNotFoundError("Order");
    }

    // Validate status transition (basic validation - can be enhanced)
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered", "returned"],
      delivered: ["returned", "refunded"],
      cancelled: ["refunded"],
      returned: ["refunded"],
      refunded: [],
    };

    const allowedStatuses = validTransitions[currentOrder.status] || [];
    if (!allowedStatuses.includes(newStatus)) {
      throw createValidationError([
        {
          field: "status",
          message: `Cannot transition from ${currentOrder.status} to ${newStatus}`,
        },
      ]);
    }

    return await db.transaction(async (tx) => {
      // Prepare order update data
      const updateOrderData: {
        status: typeof newStatus;
        updatedAt: Date;
        confirmedAt?: Date;
        shippedAt?: Date;
        deliveredAt?: Date;
        cancelledAt?: Date;
      } = {
        status: newStatus,
        updatedAt: new Date(),
      };

      // Set status-specific timestamps
      switch (newStatus) {
        case "confirmed":
          updateOrderData.confirmedAt = new Date();
          break;
        case "shipped":
          updateOrderData.shippedAt = new Date();
          break;
        case "delivered":
          updateOrderData.deliveredAt = new Date();
          break;
        case "cancelled":
          updateOrderData.cancelledAt = new Date();
          break;
      }

      // Update order
      await tx.update(orders).set(updateOrderData).where(eq(orders.id, orderId));

      // Add status history entry
      await tx.insert(orderStatusHistory).values({
        orderId,
        previousStatus: currentOrder.status,
        newStatus,
        comment,
        changedBy,
        isCustomerVisible,
      });

      // Handle modern inventory management for status changes
      const shouldRestoreInventory = shouldRestoreInventoryForStatusChange(currentOrder.status, newStatus);

      if (shouldRestoreInventory && currentOrder.orderItems) {
        const inventoryRestorations = [];
        for (const item of currentOrder.orderItems) {
          if (item.product?.inventoryQuantity !== null) {
            const restorationResult = await updateInventorySafely(
              tx,
              item.productId,
              item.quantity, // positive number to increase inventory
              "increase"
            );
            inventoryRestorations.push(restorationResult);
          }
        }
      }

      // Return updated order
      return (await getOrderById(orderId)) as OrderWithRelations;
    });
  });
};

/**
 * Confirm payment for an order (admin only)
 * @param confirmData - Payment confirmation data
 * @returns Promise resolving to updated order
 */
export const confirmPayment = async (confirmData: ConfirmPaymentRequest): Promise<OrderWithRelations> => {
  return dbErrorHandlers.update(async () => {
    const { orderId, comment, changedBy, isCustomerVisible = true } = confirmData;

    // Get current order
    const currentOrder = await getOrderById(orderId);
    if (!currentOrder) {
      throw createNotFoundError("Order");
    }

    // Check if payment is already confirmed
    if (currentOrder.paymentConfirmed) {
      throw createValidationError([
        {
          field: "paymentConfirmed",
          message: "Payment is already confirmed for this order",
        },
      ]);
    }

    return await db.transaction(async (tx) => {
      // Update order payment confirmation
      await tx
        .update(orders)
        .set({
          paymentConfirmed: true,
          updatedAt: new Date(),
          status: currentOrder.status === "pending" ? "confirmed" : currentOrder.status,
        })
        .where(eq(orders.id, orderId));

      // Add status history entry for payment confirmation
      await tx.insert(orderStatusHistory).values({
        orderId,
        previousStatus: currentOrder.status,
        newStatus: currentOrder.status === "pending" ? "confirmed" : currentOrder.status,
        comment: comment ?? "Payment confirmed by admin",
        changedBy,
        isCustomerVisible,
      });

      // Return updated order
      return (await getOrderById(orderId)) as OrderWithRelations;
    });
  });
};

/**
 * Cancel an order (convenience method)
 * @param orderId - Order ID to cancel
 * @param reason - Cancellation reason
 * @param cancelledBy - User ID who cancelled the order
 * @returns Promise resolving to cancelled order
 */
export const cancelOrder = async (orderId: string, reason: string, cancelledBy?: string): Promise<OrderWithRelations> => {
  return updateOrderStatus({
    orderId,
    newStatus: "cancelled",
    comment: reason,
    changedBy: cancelledBy,
    isCustomerVisible: true,
  });
};

// ============================================================================
// Order Analytics (Basic)
// ============================================================================

/**
 * Get basic order statistics
 * @param userId - Optional user ID to filter by user
 * @returns Promise resolving to order statistics
 */
export const getOrderStatistics = async (userId?: string) => {
  try {
    const whereCondition = userId ? eq(orders.userId, userId) : undefined;

    const [totalOrders, pendingOrders, completedOrders, cancelledOrders, totalRevenue] = await Promise.all([
      db.select({ count: count() }).from(orders).where(whereCondition),
      db
        .select({ count: count() })
        .from(orders)
        .where(userId ? and(eq(orders.userId, userId), eq(orders.status, "pending")) : eq(orders.status, "pending")),
      db
        .select({ count: count() })
        .from(orders)
        .where(userId ? and(eq(orders.userId, userId), eq(orders.status, "delivered")) : eq(orders.status, "delivered")),
      db
        .select({ count: count() })
        .from(orders)
        .where(userId ? and(eq(orders.userId, userId), eq(orders.status, "cancelled")) : eq(orders.status, "cancelled")),
      db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL)), 0)`,
        })
        .from(orders)
        .where(userId ? and(eq(orders.userId, userId), eq(orders.status, "delivered")) : eq(orders.status, "delivered")),
    ]);

    return {
      totalOrders: totalOrders[0].count,
      pendingOrders: pendingOrders[0].count,
      completedOrders: completedOrders[0].count,
      cancelledOrders: cancelledOrders[0].count,
      totalRevenue: totalRevenue[0].total || 0,
    };
  } catch (error) {
    logger.error("Failed to get order statistics", error as Error, { userId });
    throw new Error("Failed to retrieve order statistics");
  }
};
