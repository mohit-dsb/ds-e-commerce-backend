import { db } from "@/db";
import { nanoid } from "nanoid";
import { logger } from "@/utils/logger";
import { HonoJWTService } from "@/utils/hono-jwt";
import { verifyPassword } from "@/utils/password";
import { createNotFoundError } from "@/utils/errors";
import { dbErrorHandlers } from "@/utils/database-errors";
import { users, sessions, passwordResets } from "@/db/schema";
import { eq, and, gt, type InferSelectModel } from "drizzle-orm";

export type User = InferSelectModel<typeof users>;

// ============================================================================
// JWT Token Management Functions
// ============================================================================

/**
 * Generate a JWT token for a user
 * @param userId - User ID to generate token for
 * @returns Promise resolving to JWT token string
 */
export const generateToken = async (userId: string): Promise<string> => {
  return await HonoJWTService.generateToken(userId, {});
};

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Promise resolving to decoded payload or null if invalid
 */
export const verifyToken = async (token: string): Promise<{ userId: string } | null> => {
  const payload = await HonoJWTService.verifyToken(token);
  return payload ? { userId: payload.userId } : null;
};

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Authenticate user with email and password
 * @param email - User email
 * @param password - User password
 * @returns Promise resolving to user or null if authentication fails
 */
export const authenticateUser = async (email: string, password: string): Promise<User | null> => {
  return dbErrorHandlers.read(async () => {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      logger.warn("Authentication failed - user not found", { metadata: { email } });
      return null;
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      logger.warn("Authentication failed - invalid password", { metadata: { email } });
      return null;
    }

    logger.info("User authenticated successfully", { metadata: { userId: user.id, email } });
    return user;
  });
};

// ============================================================================
// Session Management Functions
// ============================================================================

/**
 * Create a new session for a user
 * @param userId - User ID to create session for
 * @returns Promise resolving to session token
 */
export const createSession = async (userId: string): Promise<string> => {
  return dbErrorHandlers.create(async () => {
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(sessions).values({
      userId,
      token,
      expiresAt,
    });

    logger.info("Session created", {
      metadata: { userId, expiresAt: expiresAt.toISOString() },
    });

    return token;
  });
};

/**
 * Validate a session token and return associated user
 * @param token - Session token to validate
 * @returns Promise resolving to user or null if session invalid
 */
export const validateSession = async (token: string): Promise<User | null> => {
  return dbErrorHandlers.read(async () => {
    const [session] = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));

    if (!session) {
      logger.warn("Invalid or expired session token", {
        metadata: { hasToken: !!token },
      });
      return null;
    }

    return session.user;
  });
};

/**
 * Revoke/delete a session token
 * @param token - Session token to revoke
 */
export const revokeSession = async (token: string): Promise<void> => {
  await dbErrorHandlers.delete(async () => {
    await db.delete(sessions).where(eq(sessions.token, token));

    logger.info("Session revoked", {
      metadata: { tokenProvided: !!token },
    });
  });
};

// ============================================================================
// Password Reset Functions
// ============================================================================

/**
 * Create a password reset token for a user
 * @param email - Email of the user to create reset token for
 * @returns Promise resolving to reset token
 */
export const createPasswordResetToken = async (email: string): Promise<string> => {
  return dbErrorHandlers.create(async () => {
    // Check if user exists by email
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      throw createNotFoundError("User");
    }

    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResets).values({
      userId: user.id,
      token,
      expiresAt,
    });

    logger.info("Password reset token created", {
      metadata: { userId: user.id, expiresAt: expiresAt.toISOString() },
    });

    return token;
  });
};

/**
 * Validate a password reset token
 * @param token - Reset token to validate
 * @returns Promise resolving to user ID or null if token invalid
 */
export const validatePasswordResetToken = async (token: string): Promise<string | null> => {
  return dbErrorHandlers.read(async () => {
    const [reset] = await db
      .select()
      .from(passwordResets)
      .where(and(eq(passwordResets.token, token), eq(passwordResets.used, false), gt(passwordResets.expiresAt, new Date())));

    if (!reset) {
      logger.warn("Invalid or expired password reset token", {
        metadata: { hasToken: !!token },
      });
      return null;
    }

    return reset.userId;
  });
};

/**
 * Mark a password reset token as used
 * @param token - Reset token to mark as used
 */
export const usePasswordResetToken = async (token: string): Promise<void> => {
  await dbErrorHandlers.update(async () => {
    await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.token, token));

    logger.info("Password reset token used", {
      metadata: { tokenProvided: !!token },
    });
  });
};
