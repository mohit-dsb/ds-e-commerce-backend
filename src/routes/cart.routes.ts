import { Hono } from "hono";
import * as cartController from "@/controllers/cart.controller";
import { compatibleZValidator } from "@/middleware/validation.middleware";
import { authMiddleware } from "@/middleware/auth.middleware";
import { addToCartSchema, updateCartItemSchema, cartQuerySchema } from "@/db/validators";

const cartRoutes = new Hono();

// All cart routes require authentication
cartRoutes.use("*", authMiddleware);

// ============================================================================
// Shopping Cart Routes
// ============================================================================

/**
 * @route GET /api/cart
 * @desc Get user's shopping cart
 * @access Private (Authenticated users)
 * @query {boolean} [includeProduct=true] - Include product details
 */
cartRoutes.get("/", compatibleZValidator("query", cartQuerySchema.optional()), cartController.getCart);

/**
 * @route GET /api/cart/summary
 * @desc Get cart summary (lightweight)
 * @access Private (Authenticated users)
 */
cartRoutes.get("/summary", cartController.getCartSummary);

/**
 * @route POST /api/cart/items
 * @desc Add item to cart
 * @access Private (Authenticated users)
 * @body {AddToCartRequest} - Item to add to cart
 */
cartRoutes.post("/items", compatibleZValidator("json", addToCartSchema), cartController.addToCart);

/**
 * @route PATCH /api/cart/items/:itemId
 * @desc Update cart item quantity
 * @access Private (Authenticated users)
 * @param {string} itemId - Cart item ID
 * @body {UpdateCartItemRequest} - Updated quantity
 */
cartRoutes.patch("/items/:itemId", compatibleZValidator("json", updateCartItemSchema), cartController.updateCartItem);

/**
 * @route DELETE /api/cart/items/:itemId
 * @desc Remove item from cart
 * @access Private (Authenticated users)
 * @param {string} itemId - Cart item ID
 */
cartRoutes.delete("/items/:itemId", cartController.removeFromCart);

/**
 * @route DELETE /api/cart
 * @desc Clear user's cart
 * @access Private (Authenticated users)
 */
cartRoutes.delete("/", cartController.clearCart);

export default cartRoutes;
