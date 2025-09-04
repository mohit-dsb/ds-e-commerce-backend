import allPaths from "./paths";
import allSchemas from "./combined-schemas";

// Base OpenAPI specification
export const openAPISpec = {
  openapi: "3.0.3",
  info: {
    title: "DS E-commerce API",
    version: "1.0.0",
    description: `
# DS E-commerce Backend API

A comprehensive RESTful API for a modern e-commerce platform built with Hono, Bun, and TypeScript.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Product Management**: Complete CRUD operations for products with categories and inventory
- **Order Management**: Full order lifecycle from cart to delivery
- **User Management**: User profiles, shipping addresses, and preferences
- **Image Upload**: Cloudinary integration for product images
- **Search & Filtering**: Advanced product search with multiple filters
- **Real-time Inventory**: Stock tracking and low-stock notifications

## Authentication

This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

API endpoints are rate-limited to ensure fair usage and prevent abuse.

## Error Handling

All endpoints return consistent error responses with appropriate HTTP status codes and error details.
    `,
    contact: {
      name: "API Support",
      url: "https://github.com/mohit-dsb/ds-e-commerce-backend",
      email: "support@example.com",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "https://ds-e-commerce-backend.onrender.com",
      description: "Production Server",
    },
    {
      url: "http://localhost:3000",
      description: "Development Server",
    },
  ],
  tags: [
    {
      name: "Authentication",
      description: "User authentication and authorization endpoints",
    },
    {
      name: "Users",
      description: "User profile management",
    },
    {
      name: "Categories",
      description: "Product category management",
    },
    {
      name: "Products",
      description: "Product catalog management",
    },
    {
      name: "Orders",
      description: "Order management and tracking",
    },
    {
      name: "Shipping",
      description: "Shipping address management",
    },
    {
      name: "Images",
      description: "Image upload and management",
    },
    {
      name: "Health",
      description: "System health and status",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token obtained from login endpoint",
      },
    },
    responses: {
      UnauthorizedError: {
        description: "Authentication required",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              error: {
                code: "UNAUTHORIZED",
                message: "Authentication required",
                timestamp: "2024-01-15T10:30:00Z",
                path: "/api/protected-endpoint",
              },
            },
          },
        },
      },
      ForbiddenError: {
        description: "Insufficient permissions",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              error: {
                code: "FORBIDDEN",
                message: "Admin access required",
                timestamp: "2024-01-15T10:30:00Z",
              },
            },
          },
        },
      },
      ValidationError: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ValidationErrorResponse",
            },
          },
        },
      },
      NotFoundError: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              error: {
                code: "NOT_FOUND",
                message: "Resource not found",
                timestamp: "2024-01-15T10:30:00Z",
              },
            },
          },
        },
      },
      InternalServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              error: {
                code: "INTERNAL_ERROR",
                message: "An unexpected error occurred",
                timestamp: "2024-01-15T10:30:00Z",
              },
            },
          },
        },
      },
    },
    parameters: {
      PageParam: {
        name: "page",
        in: "query",
        description: "Page number for pagination",
        required: false,
        schema: {
          type: "integer",
          minimum: 1,
          default: 1,
        },
      },
      LimitParam: {
        name: "limit",
        in: "query",
        description: "Number of items per page",
        required: false,
        schema: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          default: 20,
        },
      },
      SortByParam: {
        name: "sortBy",
        in: "query",
        description: "Field to sort by",
        required: false,
        schema: {
          type: "string",
        },
      },
      SortOrderParam: {
        name: "sortOrder",
        in: "query",
        description: "Sort order",
        required: false,
        schema: {
          type: "string",
          enum: ["asc", "desc"],
          default: "desc",
        },
      },
    },
    schemas: allSchemas, // Populated by schema files
  },
  paths: allPaths, // Populated by path files
} as const;

export default openAPISpec;
