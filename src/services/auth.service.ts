import { db } from "@/db";
import { nanoid } from "nanoid";
import { logger } from "@/utils/logger";
import { HonoJWTService } from "@/utils/hono-jwt";
import { verifyPassword, hashPassword } from "@/utils/password";
import { createNotFoundError } from "@/utils/errors";
import { dbErrorHandlers } from "@/utils/database-errors";
import { users, refreshTokens, passwordResets } from "@/db/schema";
import { eq, and, gt, lt, or, type InferSelectModel } from "drizzle-orm";

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
// Refresh Token Management Functions
// ============================================================================

export interface RefreshTokenMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

/**
 * Create a new refresh token for a user
 * @param userId - User ID to create refresh token for
 * @param metadata - Device and request metadata for security tracking
 * @param parentTokenId - Parent token ID for token family rotation
 * @returns Promise resolving to plain refresh token string (not hashed)
 */
export const createRefreshToken = async (
  userId: string,
  metadata: RefreshTokenMetadata = {},
  parentTokenId?: string
): Promise<string> => {
  return dbErrorHandlers.create(async () => {
    // Generate a secure random token
    const token = nanoid(64); // Longer tokens for refresh tokens
    const tokenHash = await hashPassword(token); // Hash the token for storage
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
      parentTokenId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceFingerprint: metadata.deviceFingerprint,
    });

    logger.info("Refresh token created", {
      metadata: {
        userId,
        expiresAt: expiresAt.toISOString(),
        hasParent: !!parentTokenId,
        ipAddress: metadata.ipAddress,
      },
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
    // Get all non-revoked, non-expired refresh tokens for hash comparison
    const tokens = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.isRevoked, false), gt(refreshTokens.expiresAt, new Date())));

    // Find matching token by comparing hashes
    for (const storedToken of tokens) {
      const isValid = await verifyPassword(token, storedToken.tokenHash);
      if (isValid) {
        // Update last used timestamp
        await db
          .update(refreshTokens)
          .set({
            lastUsedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(refreshTokens.id, storedToken.id));

        logger.info("Refresh token validated", {
          metadata: {
            userId: storedToken.userId,
            tokenId: storedToken.id,
            lastUsed: new Date().toISOString(),
          },
        });

        return storedToken.userId;
      }
    }

    logger.warn("Invalid or expired refresh token", {
      metadata: { hasToken: !!token },
    });
    return null;
  });
};

/**
 * Rotate refresh token - create new token and revoke old one
 * @param oldToken - Current refresh token to replace
 * @param metadata - Device and request metadata for new token
 * @returns Promise resolving to new refresh token or null if old token invalid
 */
export const rotateRefreshToken = async (oldToken: string, metadata: RefreshTokenMetadata = {}): Promise<string | null> => {
  return dbErrorHandlers.update(async () => {
    // First validate the old token
    const userId = await validateRefreshToken(oldToken);
    if (!userId) {
      return null;
    }

    // Find the old token in database
    const tokens = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.isRevoked, false), gt(refreshTokens.expiresAt, new Date())));

    let oldTokenRecord = null;
    for (const storedToken of tokens) {
      const isMatch = await verifyPassword(oldToken, storedToken.tokenHash);
      if (isMatch) {
        oldTokenRecord = storedToken;
        break;
      }
    }

    if (!oldTokenRecord) {
      return null;
    }

    // Create new token with old token as parent (token family)
    const newToken = await createRefreshToken(userId, metadata, oldTokenRecord.id);

    // Revoke the old token
    await db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refreshTokens.id, oldTokenRecord.id));

    logger.info("Refresh token rotated", {
      metadata: {
        userId,
        oldTokenId: oldTokenRecord.id,
        parentTokenId: oldTokenRecord.id,
      },
    });

    return newToken;
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

    const deletedTokens = await db
      .delete(refreshTokens)
      .where(
        or(
          lt(refreshTokens.expiresAt, cutoffDate),
          and(eq(refreshTokens.isRevoked, true), lt(refreshTokens.revokedAt, cutoffDate))
        )
      );

    logger.info("Expired refresh tokens cleaned up", {
      metadata: {
        cutoffDate: cutoffDate.toISOString(),
        deletedCount: deletedTokens,
      },
    });

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
