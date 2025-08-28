import { Hono } from "hono";
import * as authController from "@/controllers/auth.controller";
import { compatibleZValidator } from "@/middleware/validation.middleware";
import { type AuthContext } from "@/middleware/auth.middleware";
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

// ============================================================================
// Refresh Token Routes
// ============================================================================

/**
 * @route   POST /refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (requires valid refresh token)
 * @note    Should have rate limiting in production
 */
authRoutes.post("/refresh", authController.refreshToken);

export { authRoutes };
