/**
 * JWT utility using Hono's built-in JWT functionality
 * Provides industry-standard JWT operations with better performance and security
 */

import { sign, verify, decode } from "hono/jwt";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import type { ErrorContext } from "@/types/error.types";

/**
 * JWT payload interface for type safety
 */
export interface JWTPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT configuration options
 */
export interface JWTOptions {
  expiresIn?: number; // Duration in seconds
  audience?: string;
  issuer?: string;
}

/**
 * Default JWT configuration following industry standards
 */
const DEFAULT_JWT_OPTIONS = {
  expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
  audience: "ds-ecommerce-api",
  issuer: "ds-ecommerce-backend",
} as const;

/**
 * JWT Service class using Hono's JWT implementation
 * Provides secure, performant JWT operations with proper error handling
 */
export class HonoJWTService {
  /**
   * Generate a JWT token with user ID and optional custom options
   *
   * @param userId - The user ID to encode in the token
   * @param options - Optional JWT configuration
   * @param context - Error context for logging
   * @returns Promise<string> - The signed JWT token
   * @throws Error if JWT secret is not configured or signing fails
   */
  static async generateToken(userId: string, options: JWTOptions = {}, context: ErrorContext = {}): Promise<string> {
    try {
      if (!env.JWT_SECRET) {
        logger.error("JWT secret not configured", undefined, context);
        throw new Error("Authentication configuration error");
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = options.expiresIn ?? DEFAULT_JWT_OPTIONS.expiresIn;

      const payload = {
        userId,
        iat: now,
        exp: now + expiresIn,
        aud: options.audience ?? DEFAULT_JWT_OPTIONS.audience,
        iss: options.issuer ?? DEFAULT_JWT_OPTIONS.issuer,
      };

      const token = await sign(payload, env.JWT_SECRET, "HS256");

      logger.debug("JWT token generated successfully", {
        ...context,
        metadata: {
          userId,
          expiresAt: new Date((now + expiresIn) * 1000).toISOString(),
          audience: payload.aud,
          issuer: payload.iss,
        },
      });

      return token;
    } catch (error) {
      logger.error("JWT token generation failed", error as Error, context);
      throw new Error("Failed to generate authentication token");
    }
  }

  /**
   * Verify and decode a JWT token
   *
   * @param token - The JWT token to verify
   * @param context - Error context for logging
   * @returns Promise<JWTPayload | null> - The decoded payload or null if invalid
   */
  static async verifyToken(token: string, context: ErrorContext = {}): Promise<JWTPayload | null> {
    try {
      if (!env.JWT_SECRET) {
        logger.error("JWT secret not configured", undefined, context);
        return null;
      }

      if (!token || typeof token !== "string") {
        logger.warn("Invalid token format provided", {
          ...context,
          metadata: { hasToken: !!token, tokenType: typeof token },
        });
        return null;
      }

      const payload = (await verify(token, env.JWT_SECRET, "HS256")) as unknown as JWTPayload;

      // Additional validation
      if (!payload.userId) {
        logger.warn("JWT token missing required userId", {
          ...context,
          metadata: { payload: { ...payload, userId: undefined } },
        });
        return null;
      }

      // Check if token is expired (Hono JWT should handle this, but double-check)
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        logger.warn("JWT token is expired", {
          ...context,
          metadata: {
            exp: payload.exp,
            now: Math.floor(Date.now() / 1000),
            userId: payload.userId,
          },
        });
        return null;
      }

      logger.debug("JWT token verified successfully", {
        ...context,
        metadata: { userId: payload.userId, exp: payload.exp },
      });

      return payload;
    } catch (error) {
      // Handle different types of JWT errors
      const errorMessage = (error as Error).message;

      if (errorMessage.includes("expired")) {
        logger.warn("JWT token expired", {
          ...context,
          metadata: { reason: errorMessage },
        });
      } else if (errorMessage.includes("invalid")) {
        logger.warn("Invalid JWT token provided", {
          ...context,
          metadata: { reason: errorMessage },
        });
      } else {
        logger.error("JWT token verification failed", error as Error, context);
      }

      return null;
    }
  }

  /**
   * Decode a JWT token without verification (for debugging purposes)
   *
   * @param token - The JWT token to decode
   * @param context - Error context for logging
   * @returns JWTPayload | null - The decoded payload or null if invalid format
   */
  static decodeToken(token: string, context: ErrorContext = {}): JWTPayload | null {
    try {
      if (!token || typeof token !== "string") {
        return null;
      }

      const payload = decode(token) as unknown as { payload: JWTPayload };

      if (!payload?.payload) {
        logger.warn("Failed to decode JWT token - invalid format", context);
        return null;
      }

      return payload.payload;
    } catch (error) {
      logger.warn("JWT token decode failed", {
        ...context,
        metadata: { error: (error as Error).message },
      });
      return null;
    }
  }

  /**
   * Extract user ID from a JWT token without full verification
   * Useful for logging or non-critical operations
   *
   * @param token - The JWT token
   * @returns string | null - The user ID or null if not found
   */
  static extractUserId(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.userId ?? null;
  }

  /**
   * Check if a token is expired without full verification
   *
   * @param token - The JWT token
   * @returns boolean - True if expired, false otherwise
   */
  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded?.exp) {
      return true; // Treat tokens without expiration as expired for security
    }

    return decoded.exp < Math.floor(Date.now() / 1000);
  }

  /**
   * Get token expiration date
   *
   * @param token - The JWT token
   * @returns Date | null - The expiration date or null if not found
   */
  static getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded?.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  }

  /**
   * Refresh a token by creating a new one with the same user ID
   * This is useful for implementing token refresh functionality
   *
   * @param token - The existing JWT token
   * @param options - Optional JWT configuration for the new token
   * @param context - Error context for logging
   * @returns Promise<string | null> - The new JWT token or null if the old token is invalid
   */
  static async refreshToken(token: string, options: JWTOptions = {}, context: ErrorContext = {}): Promise<string | null> {
    const payload = await this.verifyToken(token, context);

    if (!payload) {
      logger.warn("Cannot refresh invalid JWT token", context);
      return null;
    }

    logger.info("Refreshing JWT token", {
      ...context,
      metadata: { userId: payload.userId },
    });

    return this.generateToken(payload.userId, options, context);
  }
}
