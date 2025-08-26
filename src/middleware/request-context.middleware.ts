import { nanoid } from "nanoid";
import type { Context, Next } from "hono";

export interface RequestContext {
  requestId: string;
  startTime: number;
  ip: string;
  userAgent: string;
  method: string;
  path: string;
}

export const requestContextMiddleware = async (c: Context, next: Next) => {
  const requestId = nanoid(12);
  const startTime = Date.now();
  const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const userAgent = c.req.header("user-agent") || "unknown";
  const method = c.req.method;
  const path = c.req.path;

  const requestContext: RequestContext = {
    requestId,
    startTime,
    ip,
    userAgent,
    method,
    path,
  };

  // Set request context in Hono context
  c.set("requestContext", requestContext);

  // Add request ID to response headers
  c.header("X-Request-ID", requestId);

  await next();
};

// Helper function to get request context from Hono context
export function getRequestContext(c: Context): RequestContext | undefined {
  return c.get("requestContext");
}

// Helper function to create error context from request context
export function createErrorContext(c: Context, userId?: string) {
  const requestContext = getRequestContext(c);
  if (!requestContext) {
    return { userId };
  }

  return {
    userId,
    requestId: requestContext.requestId,
    endpoint: requestContext.path,
    method: requestContext.method,
    userAgent: requestContext.userAgent,
    ip: requestContext.ip,
  };
}
