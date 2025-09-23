import type { Context } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { logger } from "@/utils/logger";
import { isProduction } from "@/config/env";

// ============================================================================
// Cookie Configuration Constants
// ============================================================================

const COOKIE_CONFIG = {
  // Access token: Short-lived, httpOnly for security
  accessToken: {
    name: "ds-e-commerce-access-token",
    maxAge: 15 * 60, // 15 minutes
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? "strict" : "lax", // Strict in production, lax in development
    path: "/",
  },
  // Refresh token: Longer-lived, httpOnly for security
  refreshToken: {
    name: "ds-e-commerce-refresh-token",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? "strict" : "lax", // Strict in production, lax in development
    path: "/api/auth/refresh",
  },
} as const;

// ============================================================================
// Cookie Utility Functions
// ============================================================================

/**
 * Set access token in httpOnly cookie
 * @param c - Hono context
 * @param token - JWT access token
 */
export const setAccessTokenCookie = (c: Context, token: string): void => {
  try {
    setCookie(c, COOKIE_CONFIG.accessToken.name, token, {
      maxAge: COOKIE_CONFIG.accessToken.maxAge,
      httpOnly: COOKIE_CONFIG.accessToken.httpOnly,
      secure: COOKIE_CONFIG.accessToken.secure,
      sameSite: COOKIE_CONFIG.accessToken.sameSite,
      path: COOKIE_CONFIG.accessToken.path,
    });
  } catch (error) {
    logger.error("Failed to set access token cookie", error instanceof Error ? error : new Error("Unknown error"));
  }
};

/**
 * Set refresh token in httpOnly cookie
 * @param c - Hono context
 * @param token - Refresh token
 */
export const setRefreshTokenCookie = (c: Context, token: string): void => {
  try {
    setCookie(c, COOKIE_CONFIG.refreshToken.name, token, {
      maxAge: COOKIE_CONFIG.refreshToken.maxAge,
      httpOnly: COOKIE_CONFIG.refreshToken.httpOnly,
      secure: COOKIE_CONFIG.refreshToken.secure,
      sameSite: COOKIE_CONFIG.refreshToken.sameSite,
      path: COOKIE_CONFIG.refreshToken.path,
    });
  } catch (error) {
    logger.error("Failed to set refresh token cookie", error instanceof Error ? error : new Error("Unknown error"));
  }
};

/**
 * Clear access token cookie
 * @param c - Hono context
 */
export const clearAccessTokenCookie = (c: Context): void => {
  try {
    deleteCookie(c, COOKIE_CONFIG.accessToken.name, {
      httpOnly: COOKIE_CONFIG.accessToken.httpOnly,
      secure: COOKIE_CONFIG.accessToken.secure,
      sameSite: COOKIE_CONFIG.accessToken.sameSite,
      path: COOKIE_CONFIG.accessToken.path,
    });
  } catch (error) {
    logger.error("Failed to clear access token cookie", error instanceof Error ? error : new Error("Unknown error"));
  }
};

/**
 * Clear refresh token cookie
 * @param c - Hono context
 */
export const clearRefreshTokenCookie = (c: Context): void => {
  try {
    deleteCookie(c, COOKIE_CONFIG.refreshToken.name, {
      httpOnly: COOKIE_CONFIG.refreshToken.httpOnly,
      secure: COOKIE_CONFIG.refreshToken.secure,
      sameSite: COOKIE_CONFIG.refreshToken.sameSite,
      path: COOKIE_CONFIG.refreshToken.path,
    });
  } catch (error) {
    logger.error("Failed to clear refresh token cookie", error instanceof Error ? error : new Error("Unknown error"));
  }
};

/**
 * Get access token from cookie
 * @param c - Hono context
 * @returns Access token or null if not found
 */
export const getAccessTokenFromCookie = (c: Context): string | null => {
  try {
    return getCookie(c, COOKIE_CONFIG.accessToken.name) ?? null;
  } catch {
    return null;
  }
};

/**
 * Get refresh token from cookie
 * @param c - Hono context
 * @returns Refresh token or null if not found
 */
export const getRefreshTokenFromCookie = (c: Context): string | null => {
  try {
    return getCookie(c, COOKIE_CONFIG.refreshToken.name) ?? null;
  } catch {
    return null;
  }
};

/**
 * Set both access and refresh tokens in cookies
 * @param c - Hono context
 * @param accessToken - JWT access token
 * @param refreshToken - Refresh token
 */
export const setAuthCookies = (c: Context, accessToken: string, refreshToken: string): void => {
  setAccessTokenCookie(c, accessToken);
  setRefreshTokenCookie(c, refreshToken);
};

/**
 * Extract refresh token from multiple sources following security best practices
 * Priority order: 1) Authorization header, 2) Cookie
 * @param c - Hono context
 * @returns Refresh token or null if not found
 */
export const extractRefreshToken = (c: Context): string | null => {
  try {
    // 1. Try Authorization header first (most secure)
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (token && token.trim().length > 0) {
        return token.trim();
      }
    }

    // 2. Try httpOnly cookie
    const cookieToken = getRefreshTokenFromCookie(c);
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Clear both access and refresh token cookies
 * @param c - Hono context
 */
export const clearAuthCookies = (c: Context): void => {
  clearAccessTokenCookie(c);
  clearRefreshTokenCookie(c);
};
