import { Hono } from "hono";
import * as userController from "@/controllers/user.controller";
import { compatibleZValidator } from "@/middleware/validation.middleware";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  updateUserProfileSchema,
  changePasswordSchema,
  addToCartSchema,
  updateCartItemSchema,
  cartQuerySchema,
} from "@/db/validators";

const userRoutes = new Hono();

// All user routes require authentication
userRoutes.use("*", authMiddleware);

// ============================================================================
// User Profile Routes
// ============================================================================

/**
 * @route GET /api/users/profile
 * @desc Get current user profile
 * @access Private (Authenticated users)
 */
userRoutes.get("/profile", userController.getProfile);

/**
 * @route PATCH /api/users/profile
 * @desc Update user profile
 * @access Private (Authenticated users)
 * @body {UpdateUserProfileRequest} - Profile update data
 */
userRoutes.patch("/profile", compatibleZValidator("json", updateUserProfileSchema), userController.updateProfile);

/**
 * @route POST /api/users/change-password
 * @desc Change user password
 * @access Private (Authenticated users)
 * @body {ChangePasswordRequest} - Password change data
 */
userRoutes.post("/change-password", compatibleZValidator("json", changePasswordSchema), userController.changePassword);

// ============================================================================
// Shopping Cart Routes
// ============================================================================

/**
 * @route GET /api/users/cart
 * @desc Get user's shopping cart
 * @access Private (Authenticated users)
 * @query {boolean} [includeProduct=true] - Include product details
 */
userRoutes.get("/cart", compatibleZValidator("query", cartQuerySchema.optional()), userController.getCart);

/**
 * @route GET /api/users/cart/summary
 * @desc Get cart summary
 * @access Private (Authenticated users)
 */
userRoutes.get("/cart/summary", userController.getCartSummary);

/**
 * @route POST /api/users/cart/items
 * @desc Add item to cart
 * @access Private (Authenticated users)
 * @body {AddToCartRequest} - Item to add to cart
 */
userRoutes.post("/cart/items", compatibleZValidator("json", addToCartSchema), userController.addToCart);

/**
 * @route PATCH /api/users/cart/items/:itemId
 * @desc Update cart item quantity
 * @access Private (Authenticated users)
 * @param {string} itemId - Cart item ID
 * @body {UpdateCartItemRequest} - Updated quantity
 */
userRoutes.patch("/cart/items/:itemId", compatibleZValidator("json", updateCartItemSchema), userController.updateCartItem);

/**
 * @route DELETE /api/users/cart/items/:itemId
 * @desc Remove item from cart
 * @access Private (Authenticated users)
 * @param {string} itemId - Cart item ID
 */
userRoutes.delete("/cart/items/:itemId", userController.removeFromCart);

/**
 * @route DELETE /api/users/cart
 * @desc Clear user's cart
 * @access Private (Authenticated users)
 */
userRoutes.delete("/cart", userController.clearCart);

// ============================================================================
// Wishlist Routes
// ============================================================================

/**
 * @route GET /api/users/wishlist
 * @desc Get user's wishlist
 * @access Private (Authenticated users)
 */
userRoutes.get("/wishlist", userController.getWishlist);

/**
 * @route GET /api/users/wishlist/check/:productId
 * @desc Check if product is in wishlist
 * @access Private (Authenticated users)
 * @param {string} productId - Product ID to check
 */
userRoutes.get("/wishlist/check/:productId", userController.checkWishlistStatus);

/**
 * @route POST /api/users/wishlist
 * @desc Add product to wishlist
 * @access Private (Authenticated users)
 * @body {string} productId - Product ID to add
 */
userRoutes.post("/wishlist", userController.addToWishlist);

/**
 * @route DELETE /api/users/wishlist/:productId
 * @desc Remove product from wishlist
 * @access Private (Authenticated users)
 * @param {string} productId - Product ID to remove
 */
userRoutes.delete("/wishlist/:productId", userController.removeFromWishlist);

export default userRoutes;
