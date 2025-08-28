import { Hono } from "hono";
import * as authController from "@/controllers/auth.controller";
import { compatibleZValidator } from "@/middleware/validation.middleware";
import { authMiddleware, type AuthContext } from "@/middleware/auth.middleware";
import { loginSchema, registerSchema, resetPasswordSchema } from "@/db/validators";

const authRoutes = new Hono<{ Variables: AuthContext }>();

// ============================================================================
// Authentication Routes
// ============================================================================

/**
 * @route   POST /register
 * @desc    Register a new user
 * @access  Public
 */
authRoutes.post("/register", compatibleZValidator("json", registerSchema), authController.register);

/**
 * @route   POST /login
 * @desc    Login user with email and password
 * @access  Public
 */
authRoutes.post("/login", compatibleZValidator("json", loginSchema), authController.login);

/**
 * @route   POST /logout
 * @desc    Logout current user by revoking session
 * @access  Private
 */
authRoutes.post("/logout", authMiddleware, authController.logout);

/**
 * @route   POST /forgot-password
 * @desc    Request password reset token
 * @access  Public
 */
authRoutes.post(
  "/forgot-password",
  compatibleZValidator("json", loginSchema.pick({ email: true })),
  authController.forgotPassword
);

/**
 * @route   POST /reset-password
 * @desc    Reset password using token
 * @access  Public
 */
authRoutes.post("/reset-password", compatibleZValidator("json", resetPasswordSchema), authController.resetPassword);

export { authRoutes };
