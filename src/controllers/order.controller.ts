import type { Context } from "hono";
import { logger } from "@/utils/logger";
import * as orderService from "@/services/order.service";
import { createSuccessResponse } from "@/utils/response";
import type { AuthContext } from "@/middleware/auth.middleware";
import { getValidatedData } from "@/middleware/validation.middleware";
import type { createOrderSchema, updateOrderStatusSchema, cancelOrderSchema, confirmPaymentSchema } from "@/db/validators";
import { createNotFoundError, createValidationError, createAuthError } from "@/utils/errors";
import type {
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  ConfirmPaymentRequest,
  OrderFilters,
  CreateOrderItem,
} from "@/types/order.types";

// ============================================================================
// Type Definitions
// ============================================================================

type CreateOrderData = typeof createOrderSchema._type;
type UpdateOrderStatusData = typeof updateOrderStatusSchema._type;
type CancelOrderData = typeof cancelOrderSchema._type;
type ConfirmPaymentData = typeof confirmPaymentSchema._type;

// ============================================================================
// Order Management Controller Functions
// ============================================================================

/**
 * Create a new order
 * @desc Create a new order with validation and inventory checks
 * @access Private (Customer/Admin)
 */
export const createOrder = async (c: Context<{ Variables: AuthContext }>) => {
  const validatedData = getValidatedData<CreateOrderData>(c, "json");
  const user = c.get("user");

  // Prepare order data with user ID
  const orderData: CreateOrderRequest = {
    userId: user.id,
    shippingAddressId: validatedData.shippingAddressId,
    orderItems: validatedData.orderItems,
    shippingMethod: validatedData.shippingMethod,
    customerNotes: validatedData.customerNotes,
    paymentConfirmed: validatedData.paymentConfirmed,
    metadata: validatedData.metadata,
  };

  try {
    const order = await orderService.createOrder(orderData);

    return c.json(createSuccessResponse("Order created successfully", { order }), 201);
  } catch (error) {
    logger.error("Order creation failed", error as Error, {
      metadata: { userId: user.id },
    });
    throw error;
  }
};

/**
 * Get order by ID
 * @desc Retrieve order details by ID with user authorization
 * @access Private (Customer can only view own orders, Admin can view all)
 */
export const getOrder = async (c: Context<{ Variables: AuthContext }>) => {
  const orderId = c.req.param("id");
  const user = c.get("user");

  if (!orderId) {
    throw createValidationError([{ field: "id", message: "Order ID is required" }]);
  }

  const order = await orderService.getOrderById(orderId);
  if (!order) {
    throw createNotFoundError("Order");
  }

  // Authorization check: users can only view their own orders, admins can view all
  if (user.role !== "admin" && order.userId !== user.id) {
    throw createAuthError("You don't have permission to view this order");
  }

  return c.json(createSuccessResponse("Order retrieved successfully", { order }));
};

/**
 * Get order by order number
 * @desc Retrieve order details by order number with user authorization
 * @access Private (Customer can only view own orders, Admin can view all)
 */
export const getOrderByNumber = async (c: Context<{ Variables: AuthContext }>) => {
  const orderNumber = c.req.param("orderNumber");
  const user = c.get("user");

  if (!orderNumber) {
    throw createValidationError([{ field: "orderNumber", message: "Order number is required" }]);
  }

  const order = await orderService.getOrderByNumber(orderNumber);
  if (!order) {
    throw createNotFoundError("Order");
  }

  // Authorization check: users can only view their own orders, admins can view all
  if (user.role !== "admin" && order.userId !== user.id) {
    throw createAuthError("You don't have permission to view this order");
  }

  return c.json(createSuccessResponse("Order retrieved successfully", { order }));
};

/**
 * Get orders with filtering and pagination
 * @desc Get paginated list of orders with filtering options
 * @access Private (Customer sees own orders, Admin sees all orders)
 */
export const getOrders = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");
  const queryParams = c.req.query();

  // Parse and validate query parameters
  const filters: OrderFilters = {
    status: queryParams.status as OrderFilters["status"],
    orderNumber: queryParams.orderNumber,
    dateFrom: queryParams.dateFrom ? new Date(queryParams.dateFrom) : undefined,
    dateTo: queryParams.dateTo ? new Date(queryParams.dateTo) : undefined,
    minAmount: queryParams.minAmount,
    maxAmount: queryParams.maxAmount,
    shippingMethod: queryParams.shippingMethod as OrderFilters["shippingMethod"],
    sortBy: (queryParams.sortBy as OrderFilters["sortBy"]) ?? "createdAt",
    sortOrder: (queryParams.sortOrder as OrderFilters["sortOrder"]) ?? "desc",
    page: queryParams.page ? parseInt(queryParams.page, 10) : 1,
    limit: queryParams.limit ? parseInt(queryParams.limit, 10) : 20,
  };

  // For non-admin users, only show their own orders
  if (user.role !== "admin") {
    filters.userId = user.id;
  }

  const result = await orderService.getOrders(filters);

  return c.json(createSuccessResponse("Orders retrieved successfully", result));
};

/**
 * Update order status
 * @desc Update order status with validation and history tracking
 * @access Private (Admin only)
 */
export const updateOrderStatus = async (c: Context<{ Variables: AuthContext }>) => {
  const orderId = c.req.param("id");
  const validatedData = getValidatedData<UpdateOrderStatusData>(c, "json");
  const user = c.get("user");

  // Only admins can update order status
  if (user.role !== "admin") {
    throw createAuthError("You don't have permission to update order status");
  }

  if (!orderId) {
    throw createValidationError([{ field: "id", message: "Order ID is required" }]);
  }

  const updateData: UpdateOrderStatusRequest = {
    orderId,
    newStatus: validatedData.status,
    comment: validatedData.comment,
    changedBy: user.id,
    isCustomerVisible: validatedData.isCustomerVisible ?? true,
  };

  try {
    const order = await orderService.updateOrderStatus(updateData);

    return c.json(createSuccessResponse("Order status updated successfully", { order }));
  } catch (error) {
    logger.error("Order status update failed", error as Error, {
      metadata: { orderId, status: validatedData.status, userId: user.id },
    });
    throw error;
  }
};

/**
 * Cancel order
 * @desc Cancel an order (customers can cancel their own pending/confirmed orders)
 * @access Private (Customer can cancel own orders, Admin can cancel any)
 */
export const cancelOrder = async (c: Context<{ Variables: AuthContext }>) => {
  const orderId = c.req.param("id");
  const user = c.get("user");
  const validatedData = getValidatedData<CancelOrderData>(c, "json");
  const { reason } = validatedData;

  if (!orderId) {
    throw createValidationError([{ field: "id", message: "Order ID is required" }]);
  }

  // Get order to check ownership and status
  const order = await orderService.getOrderById(orderId);
  if (!order) {
    throw createNotFoundError("Order");
  }

  // Authorization check
  if (user.role !== "admin" && order.userId !== user.id) {
    throw createAuthError("You don't have permission to cancel this order");
  }

  // Business rule: customers can only cancel pending/confirmed orders
  if (user.role !== "admin" && !["pending", "confirmed"].includes(order.status)) {
    throw createValidationError([
      {
        field: "status",
        message: "Order can only be cancelled if it's pending or confirmed",
      },
    ]);
  }

  try {
    const cancelledOrder = await orderService.cancelOrder(orderId, reason, user.id);

    return c.json(createSuccessResponse("Order cancelled successfully", { order: cancelledOrder }));
  } catch (error) {
    logger.error("Order cancellation failed", error as Error, {
      metadata: { orderId, userId: user.id },
    });
    throw error;
  }
};

// ============================================================================
// Payment Confirmation
// ============================================================================

/**
 * Confirm payment for an order
 * @desc Confirm payment for an order (admin only)
 * @access Private (Admin only)
 */
export const confirmPayment = async (c: Context<{ Variables: AuthContext }>) => {
  const orderId = c.req.param("id");
  const user = c.get("user");
  const validatedData = getValidatedData<ConfirmPaymentData>(c, "json");

  // Only admins can confirm payments
  if (user.role !== "admin") {
    throw createAuthError("You don't have permission to confirm payments");
  }

  if (!orderId) {
    throw createValidationError([{ field: "id", message: "Order ID is required" }]);
  }

  const confirmData: ConfirmPaymentRequest = {
    orderId,
    comment: validatedData.comment,
    changedBy: user.id,
    isCustomerVisible: validatedData.isCustomerVisible ?? true,
  };

  try {
    const order = await orderService.confirmPayment(confirmData);

    return c.json(createSuccessResponse("Payment confirmed successfully", { order }));
  } catch (error) {
    logger.error("Payment confirmation failed", error as Error, {
      metadata: { orderId, userId: user.id },
    });
    throw error;
  }
};

// ============================================================================
// Order Analytics and Statistics
// ============================================================================

/**
 * Get order statistics
 * @desc Get order statistics for admin dashboard or user profile
 * @access Private (Admin sees global stats, Customer sees own stats)
 */
export const getOrderStatistics = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");

  // For non-admin users, only show their own statistics
  const userId = user.role === "admin" ? undefined : user.id;

  const statistics = await orderService.getOrderStatistics(userId);

  return c.json(createSuccessResponse("Order statistics retrieved successfully", { statistics }));
};

// ============================================================================
// Order Validation and Inventory
// ============================================================================

/**
 * Validate order before creation
 * @desc Validate order data and check inventory availability
 * @access Private (Customer/Admin)
 */
export const validateOrder = async (c: Context<{ Variables: AuthContext }>) => {
  const validatedData = getValidatedData<CreateOrderData>(c, "json");
  const user = c.get("user");

  const orderData: CreateOrderRequest = {
    userId: user.id,
    shippingAddressId: validatedData.shippingAddressId,
    orderItems: validatedData.orderItems,
    shippingMethod: validatedData.shippingMethod,
    customerNotes: validatedData.customerNotes,
    paymentConfirmed: validatedData.paymentConfirmed,
    metadata: validatedData.metadata,
  };

  const validation = await orderService.validateOrderRequest(orderData);

  return c.json(createSuccessResponse("Order validation completed", { validation }));
};

/**
 * Check inventory availability
 * @desc Check inventory availability for order items
 * @access Private (Customer/Admin)
 */
export const checkInventory = async (c: Context<{ Variables: AuthContext }>) => {
  const body: { orderItems: CreateOrderItem[] } = await c.req.json();
  const { orderItems } = body;

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    throw createValidationError([{ field: "orderItems", message: "Order items are required" }]);
  }

  const inventoryCheck = await orderService.checkInventoryAvailability(orderItems);

  return c.json(createSuccessResponse("Inventory check completed", { inventoryCheck }));
};

/**
 * Calculate order totals
 * @desc Calculate order totals for preview before creation
 * @access Private (Customer/Admin)
 */
export const calculateOrderTotals = async (c: Context<{ Variables: AuthContext }>) => {
  const body: {
    orderItems: CreateOrderItem[];
    shippingMethod: "standard" | "express" | "free_shipping";
  } = await c.req.json();
  const { orderItems, shippingMethod } = body;

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    throw createValidationError([{ field: "orderItems", message: "Order items are required" }]);
  }

  const calculations = await orderService.calculateOrderTotals(orderItems, shippingMethod);

  return c.json(createSuccessResponse("Order totals calculated", { calculations }));
};
