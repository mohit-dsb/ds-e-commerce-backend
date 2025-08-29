import { logger } from "../utils/logger";
import type { Context, Next } from "hono";
import * as authService from "../services/auth.service";
import * as userService from "../services/user.service";
import { createAuthError, createForbiddenError } from "../utils/errors";
import { extractAuthTokensFromCookies } from "../utils/cookie";

export interface AuthContext {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isVerified: boolean;
  };
}

/**
 * Enhanced authentication middleware supporting both Bearer tokens and cookies
 * Prioritizes cookie-based authentication for better security
 */
export const authMiddleware = async (c: Context, next: Next) => {
  let token: string | null = null;
  let authMethod: "cookie" | "bearer" = "bearer";

  // First, try to get token from cookies (preferred method)
  const cookieHeader = c.req.header("Cookie");
  const cookieTokens = extractAuthTokensFromCookies(cookieHeader);

  if (cookieTokens.accessToken) {
    token = cookieTokens.accessToken;
    authMethod = "cookie";
  } else {
    // Fallback to Bearer token authentication
    const authHeader = c.req.header("Authorization");

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
      authMethod = "bearer";
    }
  }

  if (!token) {
    logger.warn("Missing authentication token", {
      metadata: {
        hasCookies: !!cookieHeader,
        hasAuthHeader: !!c.req.header("Authorization"),
      },
    });
    throw createAuthError("Authentication required");
  }

  // Verify JWT token
  const payload = await authService.verifyToken(token);
  if (!payload) {
    logger.warn("Invalid or expired JWT token", {
      metadata: { authMethod },
    });
    throw createAuthError("Invalid or expired token");
  }

  // Get user data from database
  const user = await userService.getUserById(payload.userId);
  if (!user) {
    logger.warn("User not found for valid token", {
      metadata: { userId: payload.userId, authMethod },
    });
    throw createAuthError("User not found");
  }

  // Set user context
  c.set("user", {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isVerified: user.isVerified,
  });

  await next();
};

export const adminMiddleware = async (c: Context, next: Next) => {
  // First ensure user is authenticated
  await authMiddleware(c, () => Promise.resolve());

  const user = c.get("user") as AuthContext["user"];

  if (!user || user.role !== "admin") {
    logger.warn("Admin access denied", {
      metadata: { userId: user?.id, role: user?.role },
    });
    throw createForbiddenError("Admin access required");
  }

  await next();
};
