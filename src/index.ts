import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import { logger as honoLogger } from "hono/logger";
import { authRoutes } from "@/routes/auth.routes";
import { categoryRoutes } from "@/routes/category.routes";
import productRoutes from "@/routes/product.routes";
import orderRoutes from "@/routes/order.routes";
import shippingAddressRoutes from "@/routes/shipping-address.routes";
import userRoutes from "@/routes/user.routes";
import { errorHandlerMiddleware } from "@/middleware/error-handler.middleware";
import { createSwaggerRoute } from "@/docs/swagger";

const app = new Hono();

// Global middleware
app.use("*", honoLogger());
app.use(
  "*",
  cors({
    origin: env.NODE_ENV === "production" ? env.CORS_ORIGIN : "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: env.CORS_CREDENTIALS,
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
