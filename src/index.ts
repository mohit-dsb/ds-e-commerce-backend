import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env";
import { logger } from "hono/logger";
import authRoutes from "./routes/auth.routes";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

// Global middleware
app.use("*", logger());
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
    message: "E-commerce Backend API",
    version: "1.0.0",
    status: "healthy",
  });
});

// Routes
app.route("/api/auth", authRoutes);

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

export default {
  port: env.PORT,
  fetch: app.fetch,
};
