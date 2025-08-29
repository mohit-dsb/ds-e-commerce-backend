import type { Context } from "hono";
import { logger } from "@/utils/logger";
import * as authService from "@/services/auth.service";
import * as userService from "@/services/user.service";
import type { AuthContext } from "@/middleware/auth.middleware";
import { getValidatedData } from "@/middleware/validation.middleware";
import { sanitizeUserData, sanitizeEmail } from "@/utils/sanitization";
import { createSuccessResponse, extractDeviceMetadata } from "@/utils/response";
import type { registerSchema, loginSchema, resetPasswordSchema } from "@/db/validators";
import { createConflictError, createAuthError, BusinessRuleError } from "@/utils/errors";
import { setSecureCookies, extractAuthTokensFromCookies } from "@/utils/cookie";

// ============================================================================
// Type Definitions
// ============================================================================

type RegisterData = typeof registerSchema._type;
type LoginData = typeof loginSchema._type;
type ResetPasswordData = typeof resetPasswordSchema._type;
type ForgotPasswordData = Pick<LoginData, "email">;
type RefreshTokenData = { refreshToken: string };

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

  // Extract device metadata for security tracking
  const deviceMetadata = extractDeviceMetadata(c);

  // Generate JWT access token and refresh token
  const [accessToken, refreshToken] = await Promise.all([
    authService.generateToken(user.id),
    authService.createRefreshToken(user.id, deviceMetadata),
  ]);

  // Set secure cookies for authentication
  const setCookieHeaders: string[] = [];
  setSecureCookies(setCookieHeaders, {
    accessToken,
    refreshToken,
  });

  // Add Set-Cookie headers to response
  setCookieHeaders.forEach((cookieHeader) => {
    c.header("Set-Cookie", cookieHeader);
  });

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
      // Include tokens in response for clients that prefer headers over cookies
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

  // Extract device metadata for security tracking
  const deviceMetadata = extractDeviceMetadata(c);

  // Generate JWT access token and refresh token
  const [accessToken, refreshToken] = await Promise.all([
    authService.generateToken(user.id),
    authService.createRefreshToken(user.id, deviceMetadata),
  ]);

  // Set secure cookies for authentication
  const setCookieHeaders: string[] = [];
  setSecureCookies(setCookieHeaders, {
    accessToken,
    refreshToken,
  });

  // Add Set-Cookie headers to response
  setCookieHeaders.forEach((cookieHeader) => {
    c.header("Set-Cookie", cookieHeader);
  });

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
      // Include tokens in response for clients that prefer headers over cookies
      accessToken,
      refreshToken,
    })
  );
};

/**
 * Refresh access token using refresh token
 * @desc Generate new access token and rotate refresh token
 * @access Public (requires valid refresh token)
 * @note This endpoint should have rate limiting in production
 */
export const refreshToken = async (c: Context<{ Variables: AuthContext }>) => {
  let oldRefreshToken: string | null = null;

  // First try to get refresh token from cookies (preferred)
  const cookieHeader = c.req.header("Cookie");
  const cookieTokens = extractAuthTokensFromCookies(cookieHeader);

  if (cookieTokens.refreshToken) {
    oldRefreshToken = cookieTokens.refreshToken;
  } else {
    // Fallback to request body for backward compatibility
    const body = (await c.req.json()) as unknown;

    // Type guard to ensure body has the expected structure
    if (!body || typeof body !== "object" || !("refreshToken" in body)) {
      logger.warn("Refresh token request without valid body structure");
      throw createAuthError("Invalid request body");
    }

    const { refreshToken: bodyRefreshToken } = body as RefreshTokenData;
    oldRefreshToken = bodyRefreshToken;
  }

  if (!oldRefreshToken || typeof oldRefreshToken !== "string") {
    logger.warn("Refresh token request without valid token");
    throw createAuthError("Refresh token required");
  }

  // Extract device metadata for new token
  const deviceMetadata = extractDeviceMetadata(c);

  // Rotate refresh token (validates old token and creates new one)
  const newRefreshToken = await authService.rotateRefreshToken(oldRefreshToken, deviceMetadata);

  if (!newRefreshToken) {
    throw createAuthError("Invalid or expired refresh token");
  }

  // Get user ID from the validated refresh token
  const userId = await authService.validateRefreshToken(newRefreshToken);
  if (!userId) {
    logger.error("New refresh token validation failed after creation");
    throw createAuthError("Token generation failed");
  }

  // Generate new access token
  const accessToken = await authService.generateToken(userId);

  // Set secure cookies for new tokens
  const setCookieHeaders: string[] = [];
  setSecureCookies(setCookieHeaders, {
    accessToken,
    refreshToken: newRefreshToken,
  });

  // Add Set-Cookie headers to response
  setCookieHeaders.forEach((cookieHeader) => {
    c.header("Set-Cookie", cookieHeader);
  });

  return c.json(
    createSuccessResponse("Tokens refreshed successfully", {
      // Include tokens in response for clients that prefer headers over cookies
      accessToken,
      refreshToken: newRefreshToken,
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

  const resetToken = await authService.createPasswordResetToken(email);

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
    throw new BusinessRuleError("Invalid or expired reset token");
  }

  // Update password and mark token as used
  await userService.updatePassword(userId, password);
  await authService.usePasswordResetToken(token);

  return c.json(createSuccessResponse("Password reset successful"));
};
