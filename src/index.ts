import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { logger as honoLogger } from "hono/logger";
import { authRoutes } from "./routes/auth.routes";
import { categoryRoutes } from "./routes/category.routes";
import { requestContextMiddleware, type RequestContext } from "./middleware/request-context.middleware";
import { errorHandlerMiddleware, requestLoggingMiddleware } from "./middleware/error-handler.middleware";

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

// Health check endpoints
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "E-commerce Backend API",
    data: {
      version: "1.0.0",
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  });
});

app.get("/health", (c) => {
  return c.json({
    success: true,
    message: "Service is healthy",
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: "1.0.0",
    },
  });
});

// Routes
app.route("/api/auth", authRoutes);
app.route("/api/categories", categoryRoutes);

// Global error handler
app.onError(errorHandlerMiddleware);

// 404 handler
app.notFound((c) => {
  logger.warn("Route not found", {
    requestId: c.get("requestContext")?.requestId,
    endpoint: c.req.path,
    method: c.req.method,
  });

  return c.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
        timestamp: new Date().toISOString(),
        path: c.req.path,
      },
    },
    404
  );
});

export default {
  port: env.PORT,
  fetch: app.fetch,
};
