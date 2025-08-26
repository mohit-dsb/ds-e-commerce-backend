import { Hono } from "hono";
import { logger } from "../utils/logger";
import { AuthService } from "../services/auth.service";
import { compatibleZValidator } from "../middleware/validation.middleware";
import { createErrorContext } from "../middleware/request-context.middleware";
import { registerSchema, loginSchema, resetPasswordSchema } from "../db/schema";
import { authMiddleware, type AuthContext } from "../middleware/auth.middleware";
import { createConflictError, createAuthError, BusinessRuleError } from "../utils/errors";

const auth = new Hono<{ Variables: AuthContext }>();

// Register new user
auth.post("/register", compatibleZValidator("json", registerSchema), async (c) => {
  const { email, password, firstName, lastName } = c.req.valid("json");
  const context = createErrorContext(c);

  const existingUser = await AuthService.getUserByEmail(email, context);
  if (existingUser) {
    logger.warn("Registration attempt with existing email", {
      ...context,
      metadata: { email },
    });
    throw createConflictError("User already exists");
  }

  const user = await AuthService.createUser(
    {
      email,
      password,
      firstName,
      lastName,
    },
    context
  );

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
});

// Login user
auth.post("/login", compatibleZValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const context = createErrorContext(c);

  const user = await AuthService.getUserByEmail(email, context);
  if (!user) {
    logger.warn("Login attempt with non-existent email", {
      ...context,
      metadata: { email },
    });
    throw createAuthError("Invalid credentials");
  }

  const isValidPassword = await AuthService.verifyPassword(password, user.password, context);
  if (!isValidPassword) {
    logger.warn("Login attempt with invalid password", {
      ...context,
      metadata: { email, userId: user.id },
    });
    throw createAuthError("Invalid credentials");
  }

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
});

// Get current user profile
auth.get("/me", authMiddleware, async (c) => {
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
});

// Logout user
auth.post("/logout", authMiddleware, async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader!.substring(7);
  const user = c.get("user");
  const context = createErrorContext(c, user?.id);

  await AuthService.revokeSession(token, context);

  logger.info("User logged out successfully", {
    ...context,
    metadata: { userId: user?.id },
  });

  return c.json({
    success: true,
    message: "Logout successful",
  });
});

// Request password reset
auth.post("/forgot-password", compatibleZValidator("json", loginSchema.pick({ email: true })), async (c) => {
  const { email } = c.req.valid("json");
  const context = createErrorContext(c);

  const user = await AuthService.getUserByEmail(email, context);
  if (!user) {
    // Don't reveal if user exists or not
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

  // In production, send email with reset link
  console.log(`Password reset token for ${email}: ${resetToken}`);

  logger.info("Password reset token generated", {
    ...context,
    metadata: { userId: user.id, email },
  });

  return c.json({
    success: true,
    message: "If the email exists, a reset link has been sent",
  });
});

// Reset password
auth.post("/reset-password", compatibleZValidator("json", resetPasswordSchema), async (c) => {
  const { token, password } = c.req.valid("json");
  const context = createErrorContext(c);

  const userId = await AuthService.validatePasswordResetToken(token, context);
  if (!userId) {
    logger.warn("Password reset attempt with invalid token", {
      ...context,
      metadata: { hasToken: !!token },
    });
    throw new BusinessRuleError("Invalid or expired reset token");
  }

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
});

export default auth;
