import type { Context } from "hono";
import { logger } from "@/utils/logger";
import { createSuccessResponse } from "@/utils/response";
import { getValidatedData } from "@/middleware/validation.middleware";
import type { AuthContext } from "@/middleware/auth.middleware";
import * as userService from "@/services/user.service";
import type {
  AddToCartRequest,
  UpdateCartItemRequest,
  CartQueryRequest,
  UpdateUserProfileRequest,
  ChangePasswordRequest,
} from "@/types/user.types";

// ============================================================================
// User Profile Controllers
// ============================================================================

/**
 * Get current user profile
 * GET /api/users/profile
 */
export const getProfile = async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const user = c.get("user");
    const profile = await userService.getUserProfile(user.id);

    const response = createSuccessResponse("Profile retrieved successfully", { user: profile });
    return c.json(response, 200);
  } catch (error) {
    logger.error("Error fetching user profile:", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Update user profile
 * PATCH /api/users/profile
 */
export const updateProfile = async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const user = c.get("user");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const updateData = getValidatedData<UpdateUserProfileRequest>(c, "json");

    const result = await userService.updateUserProfile(user.id, updateData);

    const response = createSuccessResponse(result.message, { user: result.user });
    return c.json(response, 200);
  } catch (error) {
    logger.error("Error updating user profile:", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Change user password
 * POST /api/users/change-password
 */
export const changePassword = async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const user = c.get("user");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const passwordData = getValidatedData<ChangePasswordRequest>(c, "json");

    const result = await userService.changePassword(user.id, passwordData);

    const response = createSuccessResponse(result.message, { user: result.user });
    return c.json(response, 200);
  } catch (error) {
    logger.error("Error changing password:", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

// ============================================================================
// Shopping Cart Controllers
// ============================================================================

/**
 * Get user's shopping cart
 * GET /api/users/cart
 */
export const getCart = async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const user = c.get("user");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const queryParams = getValidatedData<CartQueryRequest>(c, "query");
    const { includeProduct } = queryParams;

    const cart = await userService.getUserCart(user.id, includeProduct);

    const response = createSuccessResponse("Cart retrieved successfully", { cart });
    return c.json(response, 200);
  } catch (error) {
    logger.error("Error fetching cart:", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Add item to cart
 * POST /api/users/cart/items
 */
export const addToCart = async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const user = c.get("user");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cartData = getValidatedData<AddToCartRequest>(c, "json");

    const result = await userService.addToCart(user.id, cartData);

    const response = createSuccessResponse(result.message, { cart: result.cart });
    return c.json(response, 201);
  } catch (error) {
    logger.error("Error adding to cart:", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Update cart item quantity
 * PATCH /api/users/cart/items/:itemId
 */
export const updateCartItem = async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const user = c.get("user");
    const itemId = c.req.param("itemId");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const updateData = getValidatedData<UpdateCartItemRequest>(c, "json");

    const result = await userService.updateCartItem(user.id, itemId, updateData);

    const response = createSuccessResponse(result.message, { cart: result.cart });
    return c.json(response, 200);
  } catch (error) {
    logger.error("Error updating cart item:", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Remove item from cart
 * DELETE /api/users/cart/items/:itemId
 */
export const removeFromCart = async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const user = c.get("user");
    const itemId = c.req.param("itemId");

    const result = await userService.removeFromCart(user.id, itemId);

    const response = createSuccessResponse(result.message, { cart: result.cart });
    return c.json(response, 200);
  } catch (error) {
    logger.error("Error removing from cart:", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Clear user's cart
 * DELETE /api/users/cart
 */
export const clearCart = async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const user = c.get("user");

    const result = await userService.clearCart(user.id);

    const response = createSuccessResponse(result.message, { cart: result.cart });
    return c.json(response, 200);
  } catch (error) {
    logger.error("Error clearing cart:", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Get cart summary (lightweight)
 * GET /api/users/cart/summary
 */
export const getCartSummary = async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const user = c.get("user");

    const summary = await userService.getCartSummary(user.id);

    const response = createSuccessResponse("Cart summary retrieved successfully", { summary });
    return c.json(response, 200);
  } catch (error) {
    logger.error("Error fetching cart summary:", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};
