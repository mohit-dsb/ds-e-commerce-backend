import type { Context } from "hono";
import { logger } from "@/utils/logger";
import * as authService from "@/services/auth.service";
import { createSuccessResponse } from "@/utils/response";
import type { AuthContext } from "@/middleware/auth.middleware";
import { getValidatedData } from "@/middleware/validation.middleware";
import { sanitizeUserData, sanitizeEmail } from "@/utils/sanitization";
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
  const existingUser = await authService.getUserByEmail(email);
  if (existingUser) {
    logger.warn("Registration attempt with existing email", {
      metadata: { email },
    });
    throw createConflictError("User already exists");
  }

  // Create new user
  const user = await authService.createUser({
    email,
    password,
    firstName,
    lastName,
  });

  // Create session for the new user
  const token = await authService.createSession(user.id);

  return c.json(
    createSuccessResponse("User registered successfully", {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
      },
      token,
    }),
    201
  );
};

/**
 * Login user with email and password
 * @desc Authenticate user and create session
 * @access Public
 */
export const login = async (c: Context<{ Variables: AuthContext }>) => {
  const validatedData = getValidatedData<LoginData>(c, "json");

  // Additional sanitization for email
  const email = sanitizeEmail(validatedData.email) ?? validatedData.email;
  const { password } = validatedData;

  // Find user by email
  const user = await authService.getUserByEmail(email);
  if (!user) {
    logger.warn("Login attempt with non-existent email", {
      metadata: { email },
    });
    throw createAuthError("Invalid credentials");
  }

  // Verify password
  const isValidPassword = await authService.verifyPassword(password, user.password);
  if (!isValidPassword) {
    logger.warn("Login attempt with invalid password", {
      metadata: { email, userId: user.id },
    });
    throw createAuthError("Invalid credentials");
  }

  // Create new session
  const token = await authService.createSession(user.id);

  return c.json(
    createSuccessResponse("Login successful", {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
      },
      token,
    })
  );
};

/**
 * Get current authenticated user profile
 * @desc Retrieve current user's profile information
 * @access Private (requires authentication)
 */
export const getProfile = (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");
  return c.json(createSuccessResponse("Profile retrieved successfully", { user }));
};

/**
 * Logout current user by revoking session
 * @desc Invalidate current session token
 * @access Private (requires authentication)
 */
export const logout = async (c: Context<{ Variables: AuthContext }>) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader!.substring(7); // Remove "Bearer " prefix

  // Revoke the session token
  await authService.revokeSession(token);

  return c.json(createSuccessResponse("Logout successful"));
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

  const user = await authService.getUserByEmail(email);
  if (!user) {
    // Security best practice: Don't reveal if user exists or not
    return c.json(createSuccessResponse("If the email exists, a reset link has been sent"));
  }

  const resetToken = await authService.createPasswordResetToken(user.id);

  // TODO: In production, send email with reset link instead of logging
  logger.info("Password reset token generated - Email would be sent in production", {
    metadata: {
      userId: user.id,
      email: user.email,
      // Don't log the actual token in production for security
      tokenGenerated: true,
    },
  });

  // For development only - remove in production
  if (process.env.NODE_ENV === "development") {
    logger.info(`Password reset token for ${email}: ${resetToken}`);
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
    logger.warn("Password reset attempt with invalid token", {
      metadata: { hasToken: !!token },
    });
    throw new BusinessRuleError("Invalid or expired reset token");
  }

  // Update password and mark token as used
  await authService.updatePassword(userId, password);
  await authService.usePasswordResetToken(token);

  return c.json(createSuccessResponse("Password reset successful"));
};
