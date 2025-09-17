import { Hono } from "hono";
import * as authController from "@/controllers/auth.controller";
import { compatibleZValidator } from "@/middleware/validation.middleware";
import { type AuthContext, authMiddleware } from "@/middleware/auth.middleware";
import { createUserSchema, loginSchema, resetPasswordSchema } from "@/types/user.types";

const authRoutes = new Hono<{ Variables: AuthContext }>();

// ============================================================================
// Authentication Routes
// ============================================================================

/**
 * @route   POST /register
 * @desc    Register a new user
 * @access  Public
 */
authRoutes.post("/register", compatibleZValidator("json", createUserSchema), authController.register);

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
 * @desc    Refresh access token using refresh token from header, cookie, or body
 * @access  Public (requires valid refresh token)
 * @note    Token can be provided via: 1) Authorization: Bearer <token> header, 2) httpOnly cookie
 */
authRoutes.post("/refresh", authController.refreshToken);

/**
 * @route   POST /logout
 * @desc    Logout user by clearing authentication cookies
 * @access  Private (requires authentication)
 */
authRoutes.post("/logout", authMiddleware, authController.logout);

export { authRoutes };
