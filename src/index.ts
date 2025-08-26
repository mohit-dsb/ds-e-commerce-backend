import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env";
import { logger as honoLogger } from "hono/logger";
import authRoutes from "./routes/auth.routes";
import { requestContextMiddleware, type RequestContext } from "./middleware/request-context.middleware";
import { errorHandlerMiddleware, requestLoggingMiddleware } from "./middleware/error-handler.middleware";
import { logger } from "./utils/logger";

interface AppVariables {
  requestContext: RequestContext;
}

const app = new Hono<{ Variables: AppVariables }>();

// Request context middleware (must be first)
app.use("*", requestContextMiddleware);

// Request logging
app.use("*", requestLoggingMiddleware);

// Global middleware
app.use("*", honoLogger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "E-commerce Backend API",
    data: {
      version: "1.0.0",
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
  });
});

// Routes
app.route("/api/auth", authRoutes);

// Global error handler
app.onError(errorHandlerMiddleware);

// 404 handler
app.notFound((c) => {
  logger.warn("Route not found", {
    requestId: c.get("requestContext")?.requestId,
    endpoint: c.req.path,
    method: c.req.method,
  });
  
  return c.json({ 
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
      timestamp: new Date().toISOString(),
      path: c.req.path,
    }
  }, 404);
});

export default {
  port: env.PORT,
  fetch: app.fetch,
};
