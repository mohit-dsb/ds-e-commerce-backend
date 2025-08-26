import type { Context } from "hono";
import { logger } from "../utils/logger";
import { AuthService } from "../services/auth.service";
import type { AuthContext } from "../middleware/auth.middleware";
import { createErrorContext } from "../middleware/request-context.middleware";
import { createConflictError, createAuthError, BusinessRuleError } from "../utils/errors";

// Type definitions for request data (validated by middleware)
export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export class AuthController {
  /**
   * Register a new user
   * @desc Create a new user account with email validation
   * @access Public
   */
  static async register(c: Context<{ Variables: AuthContext }>) {
    // Data is already validated by compatibleZValidator middleware
    const { email, password, firstName, lastName } = (await c.req.json()) as RegisterData;
    const context = createErrorContext(c);

    // Check if user already exists
    const existingUser = await AuthService.getUserByEmail(email, context);
    if (existingUser) {
      logger.warn("Registration attempt with existing email", {
        ...context,
        metadata: { email },
      });
      throw createConflictError("User already exists");
    }

    // Create new user
    const user = await AuthService.createUser(
      {
        email,
        password,
        firstName,
        lastName,
      },
      context
    );

    // Create session for the new user
    const token = await AuthService.createSession(user.id, context);

    logger.info("User registered successfully", {
      ...context,
      metadata: { userId: user.id, email },
    });

    return c.json(
      {
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isVerified: user.isVerified,
          },
          token,
        },
      },
      201
    );
  }

  /**
   * Login user with email and password
   * @desc Authenticate user and create session
   * @access Public
   */
  static async login(c: Context<{ Variables: AuthContext }>) {
    // Data is already validated by compatibleZValidator middleware
    const { email, password } = (await c.req.json()) as LoginData;
    const context = createErrorContext(c);

    // Find user by email
    const user = await AuthService.getUserByEmail(email, context);
    if (!user) {
      logger.warn("Login attempt with non-existent email", {
        ...context,
        metadata: { email },
      });
      throw createAuthError("Invalid credentials");
    }

    // Verify password
    const isValidPassword = await AuthService.verifyPassword(password, user.password, context);
    if (!isValidPassword) {
      logger.warn("Login attempt with invalid password", {
        ...context,
        metadata: { email, userId: user.id },
      });
      throw createAuthError("Invalid credentials");
    }

    // Create new session
    const token = await AuthService.createSession(user.id, context);

    logger.info("User logged in successfully", {
      ...context,
      metadata: { userId: user.id, email },
    });

    return c.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
        },
        token,
      },
    });
  }

  /**
   * Get current authenticated user profile
   * @desc Retrieve current user's profile information
   * @access Private (requires authentication)
   */
  static async getProfile(c: Context<{ Variables: AuthContext }>) {
    // User is already validated by authMiddleware
    const user = c.get("user");
    const context = createErrorContext(c, user?.id);

    logger.info("User profile accessed", {
      ...context,
      metadata: { userId: user?.id },
    });

    return c.json({
      success: true,
      data: { user },
    });
  }

  /**
   * Logout current user by revoking session
   * @desc Invalidate current session token
   * @access Private (requires authentication)
   */
  static async logout(c: Context<{ Variables: AuthContext }>) {
    const authHeader = c.req.header("Authorization");
    const token = authHeader!.substring(7); // Remove "Bearer " prefix
    const user = c.get("user");
    const context = createErrorContext(c, user?.id);

    // Revoke the session token
    await AuthService.revokeSession(token, context);

    logger.info("User logged out successfully", {
      ...context,
      metadata: { userId: user?.id },
    });

    return c.json({
      success: true,
      message: "Logout successful",
    });
  }

  /**
   * Request password reset token
   * @desc Send password reset token to user's email
   * @access Public
   */
  static async forgotPassword(c: Context<{ Variables: AuthContext }>) {
    // Data is already validated by compatibleZValidator middleware
    const { email } = (await c.req.json()) as ForgotPasswordData;
    const context = createErrorContext(c);

    const user = await AuthService.getUserByEmail(email, context);
    if (!user) {
      // Security best practice: Don't reveal if user exists or not
      logger.info("Password reset requested for non-existent email", {
        ...context,
        metadata: { email },
      });
      return c.json({
        success: true,
        message: "If the email exists, a reset link has been sent",
      });
    }

    const resetToken = await AuthService.createPasswordResetToken(user.id, context);

    // TODO: In production, send email with reset link instead of console.log
    console.log(`Password reset token for ${email}: ${resetToken}`);

    logger.info("Password reset token generated", {
      ...context,
      metadata: { userId: user.id, email },
    });

    return c.json({
      success: true,
      message: "If the email exists, a reset link has been sent",
    });
  }

  /**
   * Reset password using token
   * @desc Update user password with valid reset token
   * @access Public
   */
  static async resetPassword(c: Context<{ Variables: AuthContext }>) {
    // Data is already validated by compatibleZValidator middleware
    const { token, password } = (await c.req.json()) as ResetPasswordData;
    const context = createErrorContext(c);

    // Validate reset token
    const userId = await AuthService.validatePasswordResetToken(token, context);
    if (!userId) {
      logger.warn("Password reset attempt with invalid token", {
        ...context,
        metadata: { hasToken: !!token },
      });
      throw new BusinessRuleError("Invalid or expired reset token");
    }

    // Update password and mark token as used
    await AuthService.updatePassword(userId, password, context);
    await AuthService.usePasswordResetToken(token, context);

    logger.info("Password reset completed successfully", {
      ...context,
      metadata: { userId },
    });

    return c.json({
      success: true,
      message: "Password reset successful",
    });
  }
}
