import { Hono } from "hono";
import * as orderController from "@/controllers/order.controller";
import { compatibleZValidator } from "@/middleware/validation.middleware";
import { authMiddleware, type AuthContext } from "@/middleware/auth.middleware";
import { createOrderSchema, updateOrderStatusSchema, cancelOrderSchema } from "@/db/validators";

const orderRoutes = new Hono<{ Variables: AuthContext }>();

// ============================================================================
// Order Management Routes
// ============================================================================

/**
 * @route   POST /orders
 * @desc    Create a new order
 * @access  Private (Customer/Admin)
 */
orderRoutes.post("/", authMiddleware, compatibleZValidator("json", createOrderSchema), orderController.createOrder);

/**
 * @route   GET /orders
 * @desc    Get orders with filtering and pagination
 * @access  Private (Customer sees own orders, Admin sees all)
 */
orderRoutes.get("/", authMiddleware, orderController.getOrders);

/**
 * @route   GET /orders/statistics
 * @desc    Get order statistics
 * @access  Private (Admin sees global stats, Customer sees own stats)
 */
orderRoutes.get("/statistics", authMiddleware, orderController.getOrderStatistics);

/**
 * @route   GET /orders/:id
 * @desc    Get order by ID
 * @access  Private (Customer can view own orders, Admin can view all)
 */
orderRoutes.get("/:id", authMiddleware, orderController.getOrder);

/**
 * @route   GET /orders/number/:orderNumber
 * @desc    Get order by order number
 * @access  Private (Customer can view own orders, Admin can view all)
 */
orderRoutes.get("/number/:orderNumber", authMiddleware, orderController.getOrderByNumber);

/**
 * @route   PATCH /orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin only)
 */
orderRoutes.patch(
  "/:id/status",
  authMiddleware,
  compatibleZValidator("json", updateOrderStatusSchema),
  orderController.updateOrderStatus
);

/**
 * @route   POST /orders/:id/cancel
 * @desc    Cancel an order
 * @access  Private (Customer can cancel own orders, Admin can cancel any)
 */
orderRoutes.post("/:id/cancel", authMiddleware, compatibleZValidator("json", cancelOrderSchema), orderController.cancelOrder);

// ============================================================================
// Order Validation and Utility Routes
// ============================================================================

/**
 * @route   POST /orders/validate
 * @desc    Validate order before creation
 * @access  Private (Customer/Admin)
 */
orderRoutes.post("/validate", authMiddleware, compatibleZValidator("json", createOrderSchema), orderController.validateOrder);

/**
 * @route   POST /orders/check-inventory
 * @desc    Check inventory availability for order items
 * @access  Private (Customer/Admin)
 */
orderRoutes.post("/check-inventory", authMiddleware, orderController.checkInventory);

/**
 * @route   POST /orders/calculate-totals
 * @desc    Calculate order totals for preview
 * @access  Private (Customer/Admin)
 */
orderRoutes.post("/calculate-totals", authMiddleware, orderController.calculateOrderTotals);

export default orderRoutes;
