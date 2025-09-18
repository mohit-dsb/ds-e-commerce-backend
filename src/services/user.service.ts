import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { users, shoppingCarts, shoppingCartItems, products, wishlists } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/utils/password";
import { createNotFoundError, createValidationError, createConflictError, createInternalServerError } from "@/utils/errors";
import type {
  UpdateUserProfileRequest,
  ChangePasswordRequest,
  AddToCartRequest,
  UpdateCartItemRequest,
  CartItemWithProduct,
  ShoppingCartWithItems,
  CartSummary,
  CartOperationResult,
  IPublicUser,
  ICreateUser,
  IUser,
} from "@/types/user.types";

// ============================================================================
// User CRUD Functions
// ============================================================================

/**
 * Create a new user account
 * @param data - User registration data
 * @returns Promise resolving to created user
 */
export const createUser = async (data: ICreateUser): Promise<IUser> => {
  const hashedPassword = await hashPassword(data.password);

  const [user] = await db
    .insert(users)
    .values({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
    })
    .returning();

  if (!user) {
    throw createInternalServerError("Failed to create user account");
  }

  return user;
};

/**
 * Retrieve a user by email address
 * @param email - Email address to search for
 * @returns Promise resolving to user or null if not found
 */
export const getUserByEmail = async (email: string): Promise<IPublicUser | null> => {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    return null;
  }

  return user;
};

/**
 * Retrieve a user by ID
 * @param id - User ID to search for
 * @returns Promise resolving to user or null if not found
 */
export const getUserById = async (id: string): Promise<IPublicUser | null> => {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id));

  if (!user) {
    return null;
  }

  return user;
};

// ============================================================================
// User Profile Management Functions
// ============================================================================

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<IPublicUser> => {
  const user = await getUserById(userId);
  if (!user) {
    throw createNotFoundError("User");
  }

  return user;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updateData: UpdateUserProfileRequest): Promise<IPublicUser> => {
  // Check if user exists
  const existingUser = await getUserById(userId);
  if (!existingUser) {
    throw createNotFoundError("User");
  }

  // Check email uniqueness if email is being updated
  if (updateData.email && updateData.email !== existingUser.email) {
    const emailExists = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, updateData.email)))
      .limit(1);

    if (emailExists[0] && emailExists[0].id !== userId) {
      throw createConflictError("Email address already exists");
    }
  }

  // Prepare update data (phoneNumber is handled in shipping addresses)
  const updateFields = {
    firstName: updateData.firstName,
    lastName: updateData.lastName,
    email: updateData.email,
  };

  // Remove undefined fields
  const validUpdateData = Object.fromEntries(Object.entries(updateFields).filter(([, value]) => value !== undefined));

  // Update user
  const [user] = await db
    .update(users)
    .set({
      ...validUpdateData,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  if (!user) {
    throw createInternalServerError("Failed to update user profile");
  }

  return user;
};

/**
 * Change user password
 */
export const changePassword = async (userId: string, passwordData: ChangePasswordRequest): Promise<IPublicUser> => {
  // Get current user with password
  const currentUser = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      password: users.password,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!currentUser[0]) {
    throw createNotFoundError("User");
  }

  // Verify current password
  const isCurrentPasswordValid = await verifyPassword(passwordData.currentPassword, currentUser[0].password);

  if (!isCurrentPasswordValid) {
    throw createValidationError([
      {
        field: "currentPassword",
        message: "Current password is incorrect",
      },
    ]);
  }

  // Hash new password
  const hashedNewPassword = await hashPassword(passwordData.newPassword);

  // Update password
  const [user] = await db
    .update(users)
    .set({
      password: hashedNewPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  if (!user) {
    throw createInternalServerError("Failed to update password");
  }

  return user;
};

/**
 * Update user password (for password reset functionality)
 * @param userId - ID of user to update password for
 * @param newPassword - New plain text password
 */
export const updatePassword = async (userId: string, newPassword: string): Promise<void> => {
  // Verify user exists
  const user = await getUserById(userId);
  if (!user) {
    throw createNotFoundError("User");
  }

  const hashedPassword = await hashPassword(newPassword);
  await db
    .update(users)
    .set({
      password: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
};

// ============================================================================
// Cart Management Functions
// ============================================================================

/**
 * Get or create user's shopping cart
 */
export const getOrCreateCart = async (userId: string): Promise<string> => {
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
        productIsActive: products.isActive,
        productInventoryQuantity: products.inventoryQuantity,
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
            isActive: item.productIsActive ?? true,
            inventoryQuantity: item.productInventoryQuantity ?? 0,
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
const validateProductAvailability = async (productId: string, quantity: number) => {
  const product = await db
    .select({
      id: products.id,
      name: products.name,
      isActive: products.isActive,
      inventoryQuantity: products.inventoryQuantity,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product[0]) {
    throw createNotFoundError("Product");
  }

  if (!product[0].isActive) {
    throw createValidationError([
      {
        field: "productId",
        message: "Product is not available",
      },
    ]);
  }

  // Check against absolute inventory level (don't allow exceeding total available stock)
  const availableQuantity = product[0].inventoryQuantity ?? 0;
  if (quantity > availableQuantity) {
    throw createValidationError([
      {
        field: "quantity",
        message: `Only ${availableQuantity} items available in stock`,
      },
    ]);
  }

  return product[0];
};

/**
 * Add item to cart
 */
export const addToCart = async (userId: string, cartData: AddToCartRequest): Promise<CartOperationResult> => {
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
    const newQuantity = cartData.quantity;

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
  await validateProductAvailability(cartItem[0].productId, updateData.quantity);

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
  const cart = await getUserCart(userId, true);
  return cart.summary;
};

// ============================================================================
// Wishlist Management Functions
// ============================================================================

/**
 * Add product to user's wishlist
 */
export const addToWishlist = async (userId: string, productId: string): Promise<{ message: string }> => {
  // Verify product exists and is active
  const product = await db
    .select({
      id: products.id,
      name: products.name,
      isActive: products.isActive,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product[0]) {
    throw createNotFoundError("Product");
  }

  if (!product[0].isActive) {
    throw createValidationError([
      {
        field: "productId",
        message: "Product is not available",
      },
    ]);
  }

  // Check if product is already in wishlist
  const existingWishlistItem = await db
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
    .limit(1);

  if (existingWishlistItem[0]) {
    throw createConflictError("Product is already in your wishlist");
  }

  // Add to wishlist
  await db.insert(wishlists).values({
    userId,
    productId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    message: "Product added to wishlist successfully",
  };
};

/**
 * Remove product from user's wishlist
 */
export const removeFromWishlist = async (userId: string, productId: string): Promise<{ message: string }> => {
  // Check if item exists in wishlist
  const wishlistItem = await db
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
    .limit(1);

  if (!wishlistItem[0]) {
    throw createNotFoundError("Wishlist item");
  }

  // Remove from wishlist
  await db.delete(wishlists).where(eq(wishlists.id, wishlistItem[0].id));

  return {
    message: "Product removed from wishlist successfully",
  };
};

/**
 * Get user's wishlist with product details
 */
export const getUserWishlist = async (
  userId: string
): Promise<
  {
    id: string;
    userId: string;
    productId: string;
    addedAt: Date;
    product: {
      id: string;
      name: string;
      slug: string;
      price: string;
      images: string[];
      isActive: boolean;
      rating: string;
    };
  }[]
> => {
  const wishlistItems = await db
    .select({
      id: wishlists.id,
      userId: wishlists.userId,
      productId: wishlists.productId,
      addedAt: wishlists.createdAt,
      // Product fields
      productName: products.name,
      productSlug: products.slug,
      productPrice: products.price,
      productImages: products.images,
      productIsActive: products.isActive,
      productRating: products.rating,
    })
    .from(wishlists)
    .leftJoin(products, eq(wishlists.productId, products.id))
    .where(eq(wishlists.userId, userId))
    .orderBy(desc(wishlists.createdAt));

  // Filter out items with deleted products and map to proper format
  return wishlistItems
    .filter((item) => item.productName) // Only include items with valid products
    .map((item) => ({
      id: item.id,
      userId: item.userId,
      productId: item.productId,
      addedAt: item.addedAt,
      product: {
        id: item.productId,
        name: item.productName!,
        slug: item.productSlug ?? "",
        price: item.productPrice ?? "0",
        images: item.productImages ?? [],
        isActive: item.productIsActive ?? true,
        rating: item.productRating ?? "0.00",
      },
    }));
};

/**
 * Check if product is in user's wishlist
 */
export const isInWishlist = async (userId: string, productId: string): Promise<boolean> => {
  const wishlistItem = await db
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
    .limit(1);

  return !!wishlistItem[0];
};
