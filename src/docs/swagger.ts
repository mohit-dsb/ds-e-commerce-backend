// Swagger UI integration for Hono
import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { openAPISpec } from "./openapi";

export const createSwaggerRoute = () => {
  const docsApp = new Hono();

  // Serve OpenAPI JSON specification
  docsApp.get("/openapi.json", (c) => {
    return c.json(openAPISpec);
  });

  // Serve Swagger UI
  docsApp.get(
    "/",
    swaggerUI({
      url: "/docs/openapi.json",
    })
  );

  // Alternative route for OpenAPI spec (common pattern)
  docsApp.get("/spec", (c) => {
    return c.json(openAPISpec);
  });

  // Health check for docs service
  docsApp.get("/health", (c) => {
    return c.json({
      success: true,
      message: "Documentation service is healthy",
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        endpoints: {
          swagger: "/docs/",
          openapi: "/docs/openapi.json",
          spec: "/docs/spec",
        },
      },
    });
  });

  return docsApp;
};

export default createSwaggerRoute;
