import { logger } from "../utils/logger";
import type { Context, Next } from "hono";
import { AuthService } from "../services/auth.service";
import { createAuthError, createForbiddenError } from "../utils/errors";

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
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("Missing or invalid authorization header");
    throw createAuthError("Authorization token required");
  }

  const token = authHeader.substring(7);
  const user = await AuthService.validateSession(token);

  if (!user) {
    logger.warn("Invalid or expired session token");
    throw createAuthError("Invalid or expired token");
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
    logger.warn("Admin access denied", {
      metadata: { userId: user?.id, role: user?.role },
    });
    throw createForbiddenError("Admin access required");
  }

  await next();
};
