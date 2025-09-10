import { type Context, Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import { logger as honoLogger } from "hono/logger";
import { authRoutes } from "@/routes/auth.routes";
import orderRoutes from "@/routes/order.routes";
import userRoutes from "@/routes/user.routes";
import productRoutes from "@/routes/product.routes";
import { createSwaggerRoute } from "@/docs/swagger";
import categoryRoutes from "@/routes/category.routes";
import shippingAddressRoutes from "@/routes/shipping-address.routes";
import { errorHandlerMiddleware } from "@/middleware/error-handler.middleware";
import { rateLimiter } from "hono-rate-limiter";
import { RATE_LIMIT } from "@/utils/constants";
import { extractDeviceMetadata } from "@/utils/response";

const app = new Hono();

// Global middleware
app.use(honoLogger());
app.use(
  cors({
    origin: (origin) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return origin;
      }

      // Check if the origin is in our allowed list
      return env.CORS_ORIGIN.includes(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Apply the rate limiting middleware to all requests.
app.use(
  rateLimiter({
    windowMs: RATE_LIMIT.WINDOW_MS,
    limit: RATE_LIMIT.MAX_REQUESTS,
    keyGenerator: (c: Context) => {
      const { ipAddress } = extractDeviceMetadata(c);
      const key = `rate_limit:${ipAddress ?? "unknown"}`;
      return key;
    },
    handler: (c) => {
      return c.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Too many requests - please try again later.`,
            timestamp: new Date().toISOString(),
          },
        },
        429
      );
    },
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
app.route("/api/products", productRoutes);
app.route("/api/orders", orderRoutes);
app.route("/api/shipping-addresses", shippingAddressRoutes);
app.route("/api/users", userRoutes);

// Documentation routes
app.route("/docs", createSwaggerRoute());

// Global error handler
app.onError(errorHandlerMiddleware);

// 404 handler
app.notFound((c) => {
  logger.warn("Route not found", {
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
