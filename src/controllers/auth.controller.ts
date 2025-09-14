import type { Context } from "hono";
import { logger } from "@/utils/logger";
import * as authService from "@/services/auth.service";
import * as userService from "@/services/user.service";
import * as emailService from "@/services/email.service";
import type { AuthContext } from "@/middleware/auth.middleware";
import { getValidatedData } from "@/middleware/validation.middleware";
import { sanitizeUserData, sanitizeEmail } from "@/utils/sanitization";
import { createSuccessResponse } from "@/utils/response";
import { setAuthCookies, clearAuthCookies, extractRefreshToken } from "@/utils/cookies";
import type { registerSchema, loginSchema, resetPasswordSchema } from "@/db/validators";
import { createConflictError, createAuthError, BusinessRuleError } from "@/utils/errors";

// ============================================================================
// Type Definitions
// ============================================================================

type RegisterData = typeof registerSchema._type;
type LoginData = typeof loginSchema._type;
type ResetPasswordData = typeof resetPasswordSchema._type;
type ForgotPasswordData = Pick<LoginData, "email">;

// ============================================================================
// Authentication Controller Functions
// ============================================================================

/**
 * Register a new user account
 * @desc Create a new user account with email validation
 * @access Public
 */
export const register = async (c: Context<{ Variables: AuthContext }>) => {
  const validatedData = getValidatedData<RegisterData>(c, "json");

  // Additional sanitization for extra safety
  const sanitizedData = sanitizeUserData(validatedData);
  const email = sanitizedData.email ?? validatedData.email;
  const firstName = sanitizedData.firstName ?? validatedData.firstName;
  const lastName = sanitizedData.lastName ?? validatedData.lastName;
  const { password } = validatedData;

  // Validate that required fields are not empty after sanitization
  if (!email || !firstName || !lastName) {
    throw new BusinessRuleError("Invalid or empty required fields after sanitization");
  }

  // Check if user already exists
  const existingUser = await userService.getUserByEmail(email);
  if (existingUser) {
    throw createConflictError("User already exists");
  }

  // Create new user
  const user = await userService.createUser({
    email,
    password,
    firstName,
    lastName,
  });

  // Generate JWT access token and refresh token
  const [accessToken, refreshToken] = await Promise.all([
    authService.generateToken(user.id),
    authService.createRefreshToken(user.id),
  ]);

  // Set tokens in httpOnly cookies
  setAuthCookies(c, accessToken, refreshToken);

  // Send welcome email (don't await to avoid blocking response)
  emailService
    .sendWelcomeEmail({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    .catch((error: unknown) => {
      logger.error("Failed to send welcome email", error instanceof Error ? error : new Error("Unknown error"), {
        metadata: {
          userId: user.id,
          email: user.email,
        },
      });
    });

  return c.json(
    createSuccessResponse("User registered successfully", {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    }),
    201
  );
};

/**
 * Login user with email and password
 * @desc Authenticate user
 * @access Public
 */
export const login = async (c: Context<{ Variables: AuthContext }>) => {
  const validatedData = getValidatedData<LoginData>(c, "json");

  // Additional sanitization for email
  const email = sanitizeEmail(validatedData.email) ?? validatedData.email;
  const { password } = validatedData;

  // Authenticate user
  const user = await authService.authenticateUser(email, password);
  if (!user) {
    throw createAuthError("Invalid credentials");
  }

  // Generate JWT access token and refresh token
  const [accessToken, refreshToken] = await Promise.all([
    authService.generateToken(user.id),
    authService.createRefreshToken(user.id),
  ]);

  // Set tokens in httpOnly cookies
  setAuthCookies(c, accessToken, refreshToken);

  return c.json(
    createSuccessResponse("Login successful", {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    })
  );
};

/**
 * Refresh access token using refresh token
 * @desc Generate new access token and rotate refresh token
 * @access Public (requires valid refresh token)
 * @note Token extracted from: 1) Authorization header, 2) httpOnly cookie
 */
export const refreshToken = async (c: Context<{ Variables: AuthContext }>) => {
  // Extract refresh token from multiple sources (header, cookie, body)
  const oldRefreshToken = extractRefreshToken(c);

  if (!oldRefreshToken) {
    logger.warn("Refresh token request without valid token in any source");
    throw createAuthError("Refresh token required");
  }

  // Validate the refresh token
  const userId = await authService.validateRefreshToken(oldRefreshToken);
  if (!userId) {
    logger.warn("Refresh token validation failed");
    throw createAuthError("Invalid or expired refresh token");
  }

  // Generate new access token
  const accessToken = await authService.generateToken(userId);

  // Set updated tokens in httpOnly cookies (keep same refresh token)
  setAuthCookies(c, accessToken, oldRefreshToken);

  return c.json(
    createSuccessResponse("Tokens refreshed successfully", {
      accessToken,
      refreshToken: oldRefreshToken,
    })
  );
};

/**
 * Request password reset token
 * @desc Send password reset token to user's email
 * @access Public
 */
export const forgotPassword = async (c: Context<{ Variables: AuthContext }>) => {
  const validatedData = getValidatedData<ForgotPasswordData>(c, "json");

  // Additional sanitization for email
  const email = sanitizeEmail(validatedData.email) ?? validatedData.email;

  const user = await userService.getUserByEmail(email);
  if (!user) {
    // Security best practice: Don't reveal if user exists or not
    return c.json(createSuccessResponse("If the email exists, a reset link has been sent"));
  }

  try {
    // Create password reset token with expiration
    const resetToken = await authService.createPasswordResetToken(email);

    // Send password reset email
    await emailService.sendPasswordResetEmail({
      email: user.email,
      firstName: user.firstName,
      resetToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    // Send security alert for password reset request
    await emailService.sendSecurityAlertEmail({
      email: user.email,
      firstName: user.firstName,
      eventType: "password_reset",
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Password reset process failed", error instanceof Error ? error : new Error("Unknown error"));
    // Don't throw error to maintain security - user shouldn't know about internal failures
  }

  return c.json(createSuccessResponse("If the email exists, a reset link has been sent"));
};

/**
 * Reset password using token
 * @desc Update user password with valid reset token
 * @access Public
 */
export const resetPassword = async (c: Context<{ Variables: AuthContext }>) => {
  const { token, password } = getValidatedData<ResetPasswordData>(c, "json");

  // Validate reset token
  const userId = await authService.validatePasswordResetToken(token);
  if (!userId) {
    throw new BusinessRuleError("Invalid or expired reset token");
  }

  // Get user data for email notification
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new BusinessRuleError("User not found");
  }

  // Update password and mark token as used
  await Promise.all([userService.updatePassword(userId, password), authService.usePasswordResetToken(token)]);

  // Send security alert for password change
  try {
    await emailService.sendSecurityAlertEmail({
      email: user.email,
      firstName: user.firstName,
      eventType: "password_changed",
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to send password change alert", error instanceof Error ? error : new Error("Unknown error"));
    // Don't throw error as password was already changed successfully
  }

  return c.json(createSuccessResponse("Password reset successful"));
};

/**
 * Logout user by clearing authentication cookies
 * @desc Clear access and refresh token cookies
 * @access Private (requires authentication)
 */
export const logout = (c: Context<{ Variables: AuthContext }>) => {
  // Clear authentication cookies
  clearAuthCookies(c);

  return c.json(createSuccessResponse("Logged out successfully"));
};
