import { db } from "@/db";
import { logger } from "@/utils/logger";
import { eq, and, desc } from "drizzle-orm";
import { shoppingCarts, shoppingCartItems, products } from "@/db/schema";
import { createNotFoundError, createValidationError, createInternalServerError } from "@/utils/errors";
import type {
  AddToCartRequest,
  UpdateCartItemRequest,
  CartItemWithProduct,
  ShoppingCartWithItems,
  CartSummary,
  CartOperationResult,
} from "@/types/user.types";

// ============================================================================
// Cart Management Functions
// ============================================================================

/**
 * Get or create user's shopping cart
 */
export const getOrCreateCart = async (userId: string): Promise<string> => {
  logger.info("Getting or creating cart", { userId });

  // Try to find existing cart
  const existingCart = await db
    .select({ id: shoppingCarts.id })
    .from(shoppingCarts)
    .where(eq(shoppingCarts.userId, userId))
    .limit(1);

  if (existingCart[0]) {
    return existingCart[0].id;
  }

  // Create new cart
  const newCart = await db
    .insert(shoppingCarts)
    .values({
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: shoppingCarts.id });

  if (!newCart[0]) {
    throw createInternalServerError("Failed to create shopping cart");
  }

  logger.info("Created new shopping cart", { userId });
  return newCart[0].id;
};

/**
 * Calculate cart summary
 */
export const calculateCartSummary = (items: CartItemWithProduct[]): CartSummary => {
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotalNum = items.reduce((sum, item) => {
    const price = parseFloat(item.product?.price ?? "0");
    return sum + price * item.quantity;
  }, 0);

  const subtotal = subtotalNum.toFixed(2);

  // Simple tax calculation (8.5% - this should be configurable)
  const estimatedTax = (subtotalNum * 0.085).toFixed(2);
  const estimatedTotal = (subtotalNum + parseFloat(estimatedTax)).toFixed(2);

  return {
    totalItems,
    totalQuantity,
    subtotal,
    estimatedTax,
    estimatedTotal,
  };
};

/**
 * Get user's shopping cart with items
 */
export const getUserCart = async (userId: string, includeProduct = true): Promise<ShoppingCartWithItems> => {
  logger.info("Fetching user cart", { userId });

  const cartId = await getOrCreateCart(userId);

  // Get cart details
  const cart = await db
    .select({
      id: shoppingCarts.id,
      userId: shoppingCarts.userId,
      expiresAt: shoppingCarts.expiresAt,
      createdAt: shoppingCarts.createdAt,
      updatedAt: shoppingCarts.updatedAt,
    })
    .from(shoppingCarts)
    .where(eq(shoppingCarts.id, cartId))
    .limit(1);

  if (!cart[0]) {
    throw createNotFoundError("Shopping cart");
  }

  // Get cart items with product details if requested
  let items: CartItemWithProduct[] = [];

  if (includeProduct) {
    const cartItemsWithProducts = await db
      .select({
        // Cart item fields
        itemId: shoppingCartItems.id,
        cartId: shoppingCartItems.cartId,
        productId: shoppingCartItems.productId,
        quantity: shoppingCartItems.quantity,
        productVariant: shoppingCartItems.productVariant,
        addedAt: shoppingCartItems.addedAt,
        itemUpdatedAt: shoppingCartItems.updatedAt,
        // Product fields
        productName: products.name,
        productSlug: products.slug,
        productPrice: products.price,
        productImages: products.images,
        productStatus: products.status,
        productInventoryQuantity: products.inventoryQuantity,
        productAllowBackorder: products.allowBackorder,
        productWeight: products.weight,
        productWeightUnit: products.weightUnit,
      })
      .from(shoppingCartItems)
      .leftJoin(products, eq(shoppingCartItems.productId, products.id))
      .where(eq(shoppingCartItems.cartId, cartId))
      .orderBy(desc(shoppingCartItems.addedAt));

    items = cartItemsWithProducts.map((item) => ({
      id: item.itemId,
      cartId: item.cartId,
      productId: item.productId,
      quantity: item.quantity,
      productVariant: item.productVariant ?? undefined,
      addedAt: item.addedAt,
      updatedAt: item.itemUpdatedAt,
      product: item.productName
        ? {
            id: item.productId,
            name: item.productName,
            slug: item.productSlug ?? "",
            price: item.productPrice ?? "0",
            images: item.productImages ?? [],
            status: item.productStatus ?? "draft",
            inventoryQuantity: item.productInventoryQuantity ?? 0,
            allowBackorder: item.productAllowBackorder ?? false,
            weight: item.productWeight,
            weightUnit: item.productWeightUnit ?? "kg",
          }
        : undefined,
    }));
  } else {
    const cartItems = await db
      .select({
        id: shoppingCartItems.id,
        cartId: shoppingCartItems.cartId,
        productId: shoppingCartItems.productId,
        quantity: shoppingCartItems.quantity,
        productVariant: shoppingCartItems.productVariant,
        addedAt: shoppingCartItems.addedAt,
        updatedAt: shoppingCartItems.updatedAt,
      })
      .from(shoppingCartItems)
      .where(eq(shoppingCartItems.cartId, cartId))
      .orderBy(desc(shoppingCartItems.addedAt));

    items = cartItems.map((item) => ({
      ...item,
      productVariant: item.productVariant ?? undefined,
      product: undefined,
    }));
  }

  // Filter out items with deleted products
  const validItems = items.filter((item) => !includeProduct || item.product);

  const summary = calculateCartSummary(validItems);

  return {
    id: cart[0].id,
    userId: cart[0].userId!,
    expiresAt: cart[0].expiresAt,
    createdAt: cart[0].createdAt,
    updatedAt: cart[0].updatedAt,
    items: validItems,
    summary,
  };
};

/**
 * Validate product availability for cart operations
 */
const validateProductAvailability = async (productId: string, quantity: number, excludeCurrentQuantity = 0) => {
  const product = await db
    .select({
      id: products.id,
      name: products.name,
      status: products.status,
      inventoryQuantity: products.inventoryQuantity,
      allowBackorder: products.allowBackorder,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product[0]) {
    throw createNotFoundError("Product");
  }

  if (product[0].status !== "active") {
    throw createValidationError([
      {
        field: "productId",
        message: "Product is not available",
      },
    ]);
  }

  const availableQuantity = (product[0].inventoryQuantity ?? 0) + excludeCurrentQuantity;
  if (availableQuantity < quantity && !product[0].allowBackorder) {
    throw createValidationError([
      {
        field: "quantity",
        message: `Only ${availableQuantity} items available`,
      },
    ]);
  }

  return product[0];
};

/**
 * Add item to cart
 */
export const addToCart = async (userId: string, cartData: AddToCartRequest): Promise<CartOperationResult> => {
  logger.info("Adding item to cart", { userId });

  await validateProductAvailability(cartData.productId, cartData.quantity);

  const cartId = await getOrCreateCart(userId);

  // Check if item already exists in cart
  const existingItem = await db
    .select({
      id: shoppingCartItems.id,
      quantity: shoppingCartItems.quantity,
    })
    .from(shoppingCartItems)
    .where(
      and(
        eq(shoppingCartItems.cartId, cartId),
        eq(shoppingCartItems.productId, cartData.productId)
        // Note: For variant support, you might want to compare productVariant as well
      )
    )
    .limit(1);

  if (existingItem[0]) {
    // Update existing item quantity
    const newQuantity = existingItem[0].quantity + cartData.quantity;

    // Re-validate with new total quantity
    await validateProductAvailability(cartData.productId, newQuantity);

    await db
      .update(shoppingCartItems)
      .set({
        quantity: newQuantity,
        productVariant: cartData.productVariant,
        updatedAt: new Date(),
      })
      .where(eq(shoppingCartItems.id, existingItem[0].id));
  } else {
    // Add new item to cart
    await db.insert(shoppingCartItems).values({
      cartId,
      productId: cartData.productId,
      quantity: cartData.quantity,
      productVariant: cartData.productVariant,
      addedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Update cart timestamp
  await db.update(shoppingCarts).set({ updatedAt: new Date() }).where(eq(shoppingCarts.id, cartId));

  const updatedCart = await getUserCart(userId);

  return {
    cart: updatedCart,
    message: "Item added to cart successfully",
  };
};

/**
 * Update cart item quantity
 */
export const updateCartItem = async (
  userId: string,
  itemId: string,
  updateData: UpdateCartItemRequest
): Promise<CartOperationResult> => {
  logger.info("Updating cart item", { userId });

  const cartId = await getOrCreateCart(userId);

  // Get cart item
  const cartItem = await db
    .select({
      id: shoppingCartItems.id,
      cartId: shoppingCartItems.cartId,
      productId: shoppingCartItems.productId,
      quantity: shoppingCartItems.quantity,
    })
    .from(shoppingCartItems)
    .where(and(eq(shoppingCartItems.id, itemId), eq(shoppingCartItems.cartId, cartId)))
    .limit(1);

  if (!cartItem[0]) {
    throw createNotFoundError("Cart item");
  }

  // Validate product availability (excluding current quantity)
  await validateProductAvailability(cartItem[0].productId, updateData.quantity, cartItem[0].quantity);

  // Update cart item
  await db
    .update(shoppingCartItems)
    .set({
      quantity: updateData.quantity,
      updatedAt: new Date(),
    })
    .where(eq(shoppingCartItems.id, itemId));

  // Update cart timestamp
  await db.update(shoppingCarts).set({ updatedAt: new Date() }).where(eq(shoppingCarts.id, cartId));

  const updatedCart = await getUserCart(userId);

  return {
    cart: updatedCart,
    message: "Cart item updated successfully",
  };
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (userId: string, itemId: string): Promise<CartOperationResult> => {
  logger.info("Removing item from cart", { userId });

  const cartId = await getOrCreateCart(userId);

  // Verify item belongs to user's cart
  const cartItem = await db
    .select({ id: shoppingCartItems.id })
    .from(shoppingCartItems)
    .where(and(eq(shoppingCartItems.id, itemId), eq(shoppingCartItems.cartId, cartId)))
    .limit(1);

  if (!cartItem[0]) {
    throw createNotFoundError("Cart item");
  }

  // Remove item
  await db.delete(shoppingCartItems).where(eq(shoppingCartItems.id, itemId));

  // Update cart timestamp
  await db.update(shoppingCarts).set({ updatedAt: new Date() }).where(eq(shoppingCarts.id, cartId));

  const updatedCart = await getUserCart(userId);

  return {
    cart: updatedCart,
    message: "Item removed from cart successfully",
  };
};

/**
 * Clear user's cart
 */
export const clearCart = async (userId: string): Promise<CartOperationResult> => {
  logger.info("Clearing user cart", { userId });

  const cartId = await getOrCreateCart(userId);

  // Remove all items from cart
  await db.delete(shoppingCartItems).where(eq(shoppingCartItems.cartId, cartId));

  // Update cart timestamp
  await db.update(shoppingCarts).set({ updatedAt: new Date() }).where(eq(shoppingCarts.id, cartId));

  const updatedCart = await getUserCart(userId);

  return {
    cart: updatedCart,
    message: "Cart cleared successfully",
  };
};

/**
 * Get cart summary (lightweight)
 */
export const getCartSummary = async (userId: string): Promise<CartSummary> => {
  logger.info("Fetching cart summary", { userId });

  const cart = await getUserCart(userId, true);
  return cart.summary;
};
