import { db } from "@/db";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { logger } from "@/utils/logger";
import { BCRYPT_ROUNDS } from "@/utils/constants";
import { HonoJWTService } from "@/utils/hono-jwt";
import { createNotFoundError } from "@/utils/errors";
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
 * @returns Promise resolving to hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  } catch (error) {
    logger.error("Password hashing failed", error as Error, {});
    throw new Error("Failed to process password");
  }
};

/**
 * Verify a password against its hash
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to compare against
 * @returns Promise resolving to boolean indicating if password is valid
 */
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    logger.error("Password verification failed", error as Error, {});
    return false;
  }
};

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
// User Management Functions
// ============================================================================

/**
 * Create a new user account
 * @param data - User registration data
 * @returns Promise resolving to created user
 */
export const createUser = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<User> => {
  return dbErrorHandlers.create(async () => {
    const hashedPassword = await hashPassword(data.password);

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
      logger.error("Failed to create user - no user returned", undefined, {});
      throw new Error("Failed to create user account");
    }

    logger.info("User created successfully", {
      metadata: { userId: user.id, email: data.email },
    });

    return user;
  });
};

/**
 * Retrieve a user by email address
 * @param email - Email address to search for
 * @returns Promise resolving to user or null if not found
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  return dbErrorHandlers.read(async () => {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  });
};

/**
 * Retrieve a user by ID
 * @param id - User ID to search for
 * @returns Promise resolving to user or null if not found
 */
export const getUserById = async (id: string): Promise<User | null> => {
  return dbErrorHandlers.read(async () => {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  });
};

/**
 * Update a user's password
 * @param userId - ID of user to update password for
 * @param newPassword - New plain text password
 */
export const updatePassword = async (userId: string, newPassword: string): Promise<void> => {
  await dbErrorHandlers.update(async () => {
    // Verify user exists
    const user = await getUserById(userId);
    if (!user) {
      throw createNotFoundError("User");
    }

    const hashedPassword = await hashPassword(newPassword);
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info("User password updated", {
      metadata: { userId },
    });
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
 * @param userId - User ID to create reset token for
 * @returns Promise resolving to reset token
 */
export const createPasswordResetToken = async (userId: string): Promise<string> => {
  return dbErrorHandlers.create(async () => {
    // Check if user exists
    const user = await getUserById(userId);
    if (!user) {
      throw createNotFoundError("User");
    }

    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResets).values({
      userId,
      token,
      expiresAt,
    });

    logger.info("Password reset token created", {
      metadata: { userId, expiresAt: expiresAt.toISOString() },
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
