import type { Context } from "hono";
import * as cartService from "@/services/cart.service";
import { createSuccessResponse } from "@/utils/response";
import type { AuthContext } from "@/middleware/auth.middleware";
import { getValidatedData } from "@/middleware/validation.middleware";
import type { AddToCartRequest, UpdateCartItemRequest, CartQueryRequest } from "@/types/user.types";

// ============================================================================
// Cart Controller Functions
// ============================================================================

/**
 * Get user's shopping cart
 * GET /api/cart
 */
export const getCart = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");
  const queryParams = getValidatedData<CartQueryRequest>(c, "query");
  const { includeProduct } = queryParams;

  const cart = await cartService.getUserCart(user.id, includeProduct);

  return c.json(createSuccessResponse("Cart retrieved successfully", { cart }), 200);
};

/**
 * Add item to cart
 * POST /api/cart/items
 */
export const addToCart = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");
  const cartData = getValidatedData<AddToCartRequest>(c, "json");

  const result = await cartService.addToCart(user.id, cartData);

  return c.json(createSuccessResponse(result.message, { cart: result.cart }), 201);
};

/**
 * Update cart item quantity
 * PATCH /api/cart/items/:itemId
 */
export const updateCartItem = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");
  const itemId = c.req.param("itemId");
  const updateData = getValidatedData<UpdateCartItemRequest>(c, "json");

  const result = await cartService.updateCartItem(user.id, itemId, updateData);

  return c.json(createSuccessResponse(result.message, { cart: result.cart }), 200);
};

/**
 * Remove item from cart
 * DELETE /api/cart/items/:itemId
 */
export const removeFromCart = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");
  const itemId = c.req.param("itemId");

  const result = await cartService.removeFromCart(user.id, itemId);

  return c.json(createSuccessResponse(result.message, { cart: result.cart }), 200);
};

/**
 * Clear user's cart
 * DELETE /api/cart
 */
export const clearCart = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");

  const result = await cartService.clearCart(user.id);

  return c.json(createSuccessResponse(result.message, { cart: result.cart }), 200);
};

/**
 * Get cart summary (lightweight)
 * GET /api/cart/summary
 */
export const getCartSummary = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");

  const summary = await cartService.getCartSummary(user.id);

  return c.json(createSuccessResponse("Cart summary retrieved successfully", { summary }), 200);
};
