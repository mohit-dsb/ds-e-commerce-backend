import { Hono } from "hono";
import { compatibleZValidator } from "@/middleware/validation.middleware";
import { authMiddleware, type AuthContext } from "@/middleware/auth.middleware";
import * as shippingAddressController from "@/controllers/shipping-address.controller";
import { insertShippingAddressSchema, updateShippingAddressSchema } from "@/db/validators";

const shippingAddressRoutes = new Hono<{ Variables: AuthContext }>();

// ============================================================================
// Shipping Address Management Routes
// ============================================================================

/**
 * @route   POST /shipping-addresses
 * @desc    Create a new shipping address
 * @access  Private (Customer/Admin)
 */
shippingAddressRoutes.post(
  "/",
  authMiddleware,
  compatibleZValidator("json", insertShippingAddressSchema),
  shippingAddressController.createShippingAddress
);

/**
 * @route   GET /shipping-addresses
 * @desc    Get user's shipping addresses
 * @access  Private (Customer/Admin)
 */
shippingAddressRoutes.get("/", authMiddleware, shippingAddressController.getShippingAddresses);

/**
 * @route   GET /shipping-addresses/default
 * @desc    Get user's default shipping address
 * @access  Private (Customer/Admin)
 */
shippingAddressRoutes.get("/default", authMiddleware, shippingAddressController.getDefaultShippingAddress);

/**
 * @route   GET /shipping-addresses/:id
 * @desc    Get shipping address by ID
 * @access  Private (Customer can view own addresses, Admin can view all)
 */
shippingAddressRoutes.get("/:id", authMiddleware, shippingAddressController.getShippingAddress);

/**
 * @route   PATCH /shipping-addresses/:id
 * @desc    Update shipping address
 * @access  Private (Customer can update own addresses, Admin can update all)
 */
shippingAddressRoutes.patch(
  "/:id",
  authMiddleware,
  compatibleZValidator("json", updateShippingAddressSchema),
  shippingAddressController.updateShippingAddress
);

/**
 * @route   DELETE /shipping-addresses/:id
 * @desc    Delete shipping address
 * @access  Private (Customer can delete own addresses, Admin can delete all)
 */
shippingAddressRoutes.delete("/:id", authMiddleware, shippingAddressController.deleteShippingAddress);

export default shippingAddressRoutes;
