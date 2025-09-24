import { db } from "@/db";
import { nanoid } from "nanoid";
import { HonoJWTService } from "@/utils/hono-jwt";
import { verifyPassword, hashRefreshToken } from "@/utils/password";
import { createNotFoundError } from "@/utils/errors";
import { dbErrorHandlers } from "@/utils/database-errors";
import { users, refreshTokens, passwordResets } from "@/db/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import type { IUser } from "@/types/user.types";

// ============================================================================
// JWT Token Management Functions
// ============================================================================

/**
 * Generate a JWT access token for a user (15 minutes expiration)
 * @param userId - User ID to generate token for
 * @returns Promise resolving to JWT token string
 */
export const generateToken = async (userId: string): Promise<string> => {
  // Access tokens expire in 15 minutes to match the cookie expiration
  return await HonoJWTService.generateToken(userId, { expiresIn: 15 * 60 });
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
export const authenticateUser = async (email: string, password: string): Promise<IUser | null> => {
  return dbErrorHandlers.read(async () => {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      return null;
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  });
};

// ============================================================================
// Refresh Token Management Functions
// ============================================================================

/**
 * Create a new refresh token for a user
 * @param userId - User ID to create refresh token for
 * @returns Promise resolving to plain refresh token string (not hashed)
 */
export const createRefreshToken = async (userId: string): Promise<string> => {
  return dbErrorHandlers.create(async () => {
    // Generate a secure random token
    const token = nanoid(64); // Longer tokens for refresh tokens
    const tokenHash = await hashRefreshToken(token); // Fast SHA-256 hash for storage
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });

    return token; // Return plain token (not hashed) to client
  });
};

/**
 * Validate a refresh token and return user ID
 * @param token - Plain refresh token to validate
 * @returns Promise resolving to user ID or null if token invalid
 */
export const validateRefreshToken = async (token: string): Promise<string | null> => {
  return dbErrorHandlers.read(async () => {
    // Hash the provided token to compare with stored hash
    const tokenHash = await hashRefreshToken(token);

    // Find the matching token directly in the database
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), gt(refreshTokens.expiresAt, new Date())))
      .limit(1);

    if (!storedToken) {
      return null;
    }

    // Update last used timestamp
    await db
      .update(refreshTokens)
      .set({
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refreshTokens.id, storedToken.id));

    return storedToken.userId;
  });
};

/**
 * Cleanup expired refresh tokens (maintenance function)
 * @param olderThanDays - Remove tokens expired more than X days ago (default: 7)
 * @returns Promise resolving to number of tokens cleaned up
 */
export const cleanupExpiredRefreshTokens = async (olderThanDays: number = 7): Promise<number> => {
  return dbErrorHandlers.delete(async () => {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const deletedTokens = await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, cutoffDate));

    return deletedTokens as unknown as number;
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
  });
};
