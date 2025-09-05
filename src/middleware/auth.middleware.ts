import type { Context, Next } from "hono";
import * as authService from "@/services/auth.service";
import * as userService from "@/services/user.service";
import { getAccessTokenFromCookie } from "@/utils/cookies";
import { createAuthError, createForbiddenError } from "@/utils/errors";

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

export const authMiddleware = async (c: Context, next: Next) => {
  let token: string | null = null;

  // 1. Try Authorization header first (most secure and standard)
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // 2. Fallback to httpOnly cookie
  token ??= getAccessTokenFromCookie(c);

  if (!token) {
    throw createAuthError("No token provided");
  }

  // Verify JWT token
  const payload = await authService.verifyToken(token);
  if (!payload) {
    throw createAuthError("Invalid or expired token");
  }

  // Get user data from database
  const user = await userService.getUserById(payload.userId);
  if (!user) {
    throw createAuthError("User not found");
  }

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
    throw createForbiddenError("Admin access required");
  }

  await next();
};
