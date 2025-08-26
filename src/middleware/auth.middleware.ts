import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { AuthService } from "../services/auth.service";

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

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Authorization token required" });
  }

  const token = authHeader.substring(7);
  const user = await AuthService.validateSession(token);

  if (!user) {
    throw new HTTPException(401, { message: "Invalid or expired token" });
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

export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const user = await AuthService.validateSession(token);

    if (user) {
      c.set("user", {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
      });
    }
  }

  await next();
};
