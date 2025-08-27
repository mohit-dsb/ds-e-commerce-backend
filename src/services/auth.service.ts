import { db } from "@/db";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { logger } from "@/utils/logger";
import { BCRYPT_ROUNDS } from "@/utils/constants";
import { HonoJWTService } from "@/utils/hono-jwt";
import { createNotFoundError } from "@/utils/errors";
import type { ErrorContext } from "@/types/error.types";
import { dbErrorHandlers } from "@/utils/database-errors";
import { users, sessions, passwordResets } from "@/db/schema";
import { eq, and, gt, type InferSelectModel } from "drizzle-orm";

export type User = InferSelectModel<typeof users>;

// ============================================================================
// Password Management Functions
// ============================================================================

/**
 * Hash a password using bcrypt with configured rounds
 * @param password - Plain text password to hash
 * @param context - Error context for logging
 * @returns Promise resolving to hashed password
 */
export const hashPassword = async (password: string, context: ErrorContext = {}): Promise<string> => {
  try {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  } catch (error) {
    logger.error("Password hashing failed", error as Error, context);
    throw new Error("Failed to process password");
  }
};

/**
 * Verify a password against its hash
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to compare against
 * @param context - Error context for logging
 * @returns Promise resolving to boolean indicating if password is valid
 */
export const verifyPassword = async (password: string, hashedPassword: string, context: ErrorContext = {}): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    logger.error("Password verification failed", error as Error, context);
    return false;
  }
};

// ============================================================================
// JWT Token Management Functions
// ============================================================================

/**
 * Generate a JWT token for a user
 * @param userId - User ID to generate token for
 * @param context - Error context for logging
 * @returns Promise resolving to JWT token string
 */
export const generateToken = async (userId: string, context: ErrorContext = {}): Promise<string> => {
  return await HonoJWTService.generateToken(userId, {}, context);
};

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @param context - Error context for logging
 * @returns Promise resolving to decoded payload or null if invalid
 */
export const verifyToken = async (token: string, context: ErrorContext = {}): Promise<{ userId: string } | null> => {
  const payload = await HonoJWTService.verifyToken(token, context);
  return payload ? { userId: payload.userId } : null;
};

// ============================================================================
// User Management Functions
// ============================================================================

/**
 * Create a new user account
 * @param data - User registration data
 * @param context - Error context for logging
 * @returns Promise resolving to created user
 */
export const createUser = async (
  data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  },
  context: ErrorContext = {}
): Promise<User> => {
  return dbErrorHandlers.create(
    async () => {
      const hashedPassword = await hashPassword(data.password, context);

      const [user] = await db
        .insert(users)
        .values({
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
        })
        .returning();

      if (!user) {
        logger.error("Failed to create user - no user returned", undefined, context);
        throw new Error("Failed to create user account");
      }

      logger.info("User created successfully", {
        ...context,
        metadata: { userId: user.id, email: data.email },
      });

      return user;
    },
    "user",
    context
  );
};

/**
 * Retrieve a user by email address
 * @param email - Email address to search for
 * @param context - Error context for logging
 * @returns Promise resolving to user or null if not found
 */
export const getUserByEmail = async (email: string, context: ErrorContext = {}): Promise<User | null> => {
  return dbErrorHandlers.read(
    async () => {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || null;
    },
    "user",
    context
  );
};

/**
 * Retrieve a user by ID
 * @param id - User ID to search for
 * @param context - Error context for logging
 * @returns Promise resolving to user or null if not found
 */
export const getUserById = async (id: string, context: ErrorContext = {}): Promise<User | null> => {
  return dbErrorHandlers.read(
    async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || null;
    },
    "user",
    context
  );
};

/**
 * Update a user's password
 * @param userId - ID of user to update password for
 * @param newPassword - New plain text password
 * @param context - Error context for logging
 */
export const updatePassword = async (userId: string, newPassword: string, context: ErrorContext = {}): Promise<void> => {
  await dbErrorHandlers.update(
    async () => {
      // Verify user exists
      const user = await getUserById(userId, context);
      if (!user) {
        throw createNotFoundError("User", context);
      }

      const hashedPassword = await hashPassword(newPassword, context);
      await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      logger.info("User password updated", {
        ...context,
        metadata: { userId },
      });
    },
    "user",
    context
  );
};

// ============================================================================
// Session Management Functions
// ============================================================================

/**
 * Create a new session for a user
 * @param userId - User ID to create session for
 * @param context - Error context for logging
 * @returns Promise resolving to session token
 */
export const createSession = async (userId: string, context: ErrorContext = {}): Promise<string> => {
  return dbErrorHandlers.create(
    async () => {
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.insert(sessions).values({
        userId,
        token,
        expiresAt,
      });

      logger.info("Session created", {
        ...context,
        metadata: { userId, expiresAt: expiresAt.toISOString() },
      });

      return token;
    },
    "session",
    context
  );
};

/**
 * Validate a session token and return associated user
 * @param token - Session token to validate
 * @param context - Error context for logging
 * @returns Promise resolving to user or null if session invalid
 */
export const validateSession = async (token: string, context: ErrorContext = {}): Promise<User | null> => {
  return dbErrorHandlers.read(
    async () => {
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
    },
    "session",
    context
  );
};

/**
 * Revoke/delete a session token
 * @param token - Session token to revoke
 * @param context - Error context for logging
 */
export const revokeSession = async (token: string, context: ErrorContext = {}): Promise<void> => {
  await dbErrorHandlers.delete(
    async () => {
      await db.delete(sessions).where(eq(sessions.token, token));

      logger.info("Session revoked", {
        ...context,
        metadata: { tokenProvided: !!token },
      });
    },
    "session",
    context
  );
};

// ============================================================================
// Password Reset Functions
// ============================================================================

/**
 * Create a password reset token for a user
 * @param userId - User ID to create reset token for
 * @param context - Error context for logging
 * @returns Promise resolving to reset token
 */
export const createPasswordResetToken = async (userId: string, context: ErrorContext = {}): Promise<string> => {
  return dbErrorHandlers.create(
    async () => {
      // Check if user exists
      const user = await getUserById(userId, context);
      if (!user) {
        throw createNotFoundError("User", context);
      }

      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(passwordResets).values({
        userId,
        token,
        expiresAt,
      });

      logger.info("Password reset token created", {
        ...context,
        metadata: { userId, expiresAt: expiresAt.toISOString() },
      });

      return token;
    },
    "passwordReset",
    context
  );
};

/**
 * Validate a password reset token
 * @param token - Reset token to validate
 * @param context - Error context for logging
 * @returns Promise resolving to user ID or null if token invalid
 */
export const validatePasswordResetToken = async (token: string, context: ErrorContext = {}): Promise<string | null> => {
  return dbErrorHandlers.read(
    async () => {
      const [reset] = await db
        .select()
        .from(passwordResets)
        .where(and(eq(passwordResets.token, token), eq(passwordResets.used, false), gt(passwordResets.expiresAt, new Date())));

      if (!reset) {
        logger.warn("Invalid or expired password reset token", {
          ...context,
          metadata: { hasToken: !!token },
        });
        return null;
      }

      return reset.userId;
    },
    "passwordReset",
    context
  );
};

/**
 * Mark a password reset token as used
 * @param token - Reset token to mark as used
 * @param context - Error context for logging
 */
export const usePasswordResetToken = async (token: string, context: ErrorContext = {}): Promise<void> => {
  await dbErrorHandlers.update(
    async () => {
      await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.token, token));

      logger.info("Password reset token used", {
        ...context,
        metadata: { tokenProvided: !!token },
      });
    },
    "passwordReset",
    context
  );
};
