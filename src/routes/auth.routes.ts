import { Hono } from "hono";
import { AuthController } from "../controllers/auth.controller";
import { compatibleZValidator } from "../middleware/validation.middleware";
import { authMiddleware, type AuthContext } from "../middleware/auth.middleware";
import { loginSchema, registerSchema, resetPasswordSchema } from "../db/validators";

const authRoutes = new Hono<{ Variables: AuthContext }>();

// Authentication Routes

/**
 * @route   POST /register
 * @desc    Register a new user
 * @access  Public
 */
authRoutes.post("/register", compatibleZValidator("json", registerSchema), AuthController.register);

/**
 * @route   POST /login
 * @desc    Login user with email and password
 * @access  Public
 */
authRoutes.post("/login", compatibleZValidator("json", loginSchema), AuthController.login);

/**
 * @route   GET /me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
authRoutes.get("/me", authMiddleware, AuthController.getProfile);

/**
 * @route   POST /logout
 * @desc    Logout current user by revoking session
 * @access  Private
 */
authRoutes.post("/logout", authMiddleware, AuthController.logout);

/**
 * @route   POST /forgot-password
 * @desc    Request password reset token
 * @access  Public
 */
authRoutes.post(
  "/forgot-password",
  compatibleZValidator("json", loginSchema.pick({ email: true })),
  AuthController.forgotPassword
);

/**
 * @route   POST /reset-password
 * @desc    Reset password using token
 * @access  Public
 */
authRoutes.post("/reset-password", compatibleZValidator("json", resetPasswordSchema), AuthController.resetPassword);

export { authRoutes };
