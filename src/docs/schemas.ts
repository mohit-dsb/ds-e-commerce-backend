// OpenAPI schema definitions for the DS E-commerce API
// These schemas define the structure of request and response objects

export const schemas = {
  // Base Response Schemas
  ApiResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        description: "Indicates if the request was successful",
      },
      message: {
        type: "string",
        description: "Optional message providing additional context",
      },
      data: {
        description: "Response data (varies by endpoint)",
      },
    },
    required: ["success"],
  },

  ErrorResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: false,
      },
      error: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "Error code identifier",
          },
          message: {
            type: "string",
            description: "Human-readable error message",
          },
          details: {
            description: "Additional error details",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "ISO 8601 timestamp of when the error occurred",
          },
          requestId: {
            type: "string",
            description: "Unique request identifier for tracking",
          },
          path: {
            type: "string",
            description: "Request path that caused the error",
          },
        },
        required: ["code", "message", "timestamp"],
      },
    },
    required: ["success", "error"],
  },

  ValidationErrorResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: false,
      },
      error: {
        type: "object",
        properties: {
          code: {
            type: "string",
            example: "VALIDATION_ERROR",
          },
          message: {
            type: "string",
            example: "Validation failed",
          },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string",
                  description: "Field that failed validation",
                },
                message: {
                  type: "string",
                  description: "Validation error message",
                },
                value: {
                  description: "Invalid value that was provided",
                },
              },
            },
          },
          timestamp: {
            type: "string",
            format: "date-time",
          },
        },
      },
    },
  },

  PaginatedResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      message: {
        type: "string",
      },
      data: {
        type: "array",
        items: {},
      },
      pagination: {
        type: "object",
        properties: {
          page: {
            type: "integer",
            minimum: 1,
            description: "Current page number",
          },
          limit: {
            type: "integer",
            minimum: 1,
            description: "Number of items per page",
          },
          total: {
            type: "integer",
            minimum: 0,
            description: "Total number of items",
          },
          totalPages: {
            type: "integer",
            minimum: 0,
            description: "Total number of pages",
          },
          hasNext: {
            type: "boolean",
            description: "Whether there is a next page",
          },
          hasPrev: {
            type: "boolean",
            description: "Whether there is a previous page",
          },
        },
        required: ["page", "limit", "total", "totalPages", "hasNext", "hasPrev"],
      },
    },
    required: ["success", "data", "pagination"],
  },

  // Health Check Schemas
  HealthResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      message: {
        type: "string",
        example: "Service is healthy",
      },
      data: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["healthy", "unhealthy"],
            example: "healthy",
          },
          timestamp: {
            type: "string",
            format: "date-time",
          },
          environment: {
            type: "string",
            example: "development",
          },
          uptime: {
            type: "number",
            description: "Server uptime in seconds",
          },
          memory: {
            type: "object",
            properties: {
              rss: { type: "number" },
              heapTotal: { type: "number" },
              heapUsed: { type: "number" },
              external: { type: "number" },
              arrayBuffers: { type: "number" },
            },
          },
          version: {
            type: "string",
            example: "1.0.0",
          },
        },
      },
    },
  },

  // Authentication Schemas
  LoginRequest: {
    type: "object",
    properties: {
      email: {
        type: "string",
        format: "email",
        description: "User email address",
        example: "user@example.com",
      },
      password: {
        type: "string",
        minLength: 1,
        description: "User password",
        example: "securepassword123",
      },
    },
    required: ["email", "password"],
  },

  RegisterRequest: {
    type: "object",
    properties: {
      email: {
        type: "string",
        format: "email",
        description: "User email address",
        example: "newuser@example.com",
      },
      password: {
        type: "string",
        minLength: 8,
        description: "User password (minimum 8 characters)",
        example: "securepassword123",
      },
      firstName: {
        type: "string",
        minLength: 1,
        description: "User first name",
        example: "John",
      },
      lastName: {
        type: "string",
        minLength: 1,
        description: "User last name",
        example: "Doe",
      },
    },
    required: ["email", "password", "firstName", "lastName"],
  },

  ForgotPasswordRequest: {
    type: "object",
    properties: {
      email: {
        type: "string",
        format: "email",
        description: "Email address to send reset token to",
        example: "user@example.com",
      },
    },
    required: ["email"],
  },

  ResetPasswordRequest: {
    type: "object",
    properties: {
      token: {
        type: "string",
        description: "Password reset token received via email",
        example: "abc123def456",
      },
      password: {
        type: "string",
        minLength: 8,
        description: "New password (minimum 8 characters)",
        example: "newsecurepassword123",
      },
    },
    required: ["token", "password"],
  },

  AuthResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      message: {
        type: "string",
        example: "Authentication successful",
      },
      data: {
        type: "object",
        properties: {
          user: {
            $ref: "#/components/schemas/User",
          },
          token: {
            type: "string",
            description: "JWT authentication token",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
      },
    },
  },

  // User Schemas
  User: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        description: "Unique user identifier",
        example: "123e4567-e89b-12d3-a456-426614174000",
      },
      email: {
        type: "string",
        format: "email",
        description: "User email address",
        example: "user@example.com",
      },
      firstName: {
        type: "string",
        description: "User first name",
        example: "John",
      },
      lastName: {
        type: "string",
        description: "User last name",
        example: "Doe",
      },
      role: {
        type: "string",
        enum: ["admin", "customer"],
        description: "User role",
        example: "customer",
      },
      isVerified: {
        type: "boolean",
        description: "Whether the user email is verified",
        example: true,
      },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "Account creation timestamp",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        description: "Last update timestamp",
      },
    },
  },

  UpdateUserProfileRequest: {
    type: "object",
    properties: {
      firstName: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        example: "John",
      },
      lastName: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        example: "Doe",
      },
      email: {
        type: "string",
        format: "email",
        example: "newemail@example.com",
      },
    },
  },

  ChangePasswordRequest: {
    type: "object",
    properties: {
      currentPassword: {
        type: "string",
        minLength: 1,
        description: "Current password",
        example: "currentpassword123",
      },
      newPassword: {
        type: "string",
        minLength: 8,
        description: "New password (minimum 8 characters)",
        example: "newpassword123",
      },
      confirmPassword: {
        type: "string",
        minLength: 1,
        description: "Confirmation of new password",
        example: "newpassword123",
      },
    },
    required: ["currentPassword", "newPassword", "confirmPassword"],
  },

  // Category Schemas
  Category: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        description: "Unique category identifier",
        example: "123e4567-e89b-12d3-a456-426614174000",
      },
      name: {
        type: "string",
        description: "Category name",
        example: "Electronics",
      },
      slug: {
        type: "string",
        description: "URL-friendly category identifier",
        example: "electronics",
      },
      description: {
        type: "string",
        nullable: true,
        description: "Category description",
        example: "Electronic devices and accessories",
      },
      isActive: {
        type: "boolean",
        description: "Whether the category is active",
        example: true,
      },
      parentId: {
        type: "string",
        format: "uuid",
        nullable: true,
        description: "Parent category ID for hierarchical categories",
      },
      createdAt: {
        type: "string",
        format: "date-time",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
      },
    },
  },

  CreateCategoryRequest: {
    type: "object",
    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        description: "Category name",
        example: "Electronics",
      },
      description: {
        type: "string",
        description: "Category description",
        example: "Electronic devices and accessories",
      },
      isActive: {
        type: "boolean",
        default: true,
        description: "Whether the category is active",
      },
      parentId: {
        type: "string",
        format: "uuid",
        nullable: true,
        description: "Parent category ID for hierarchical categories",
      },
    },
    required: ["name"],
  },

  UpdateCategoryRequest: {
    type: "object",
    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        example: "Electronics",
      },
      description: {
        type: "string",
        example: "Electronic devices and accessories",
      },
      isActive: {
        type: "boolean",
      },
      parentId: {
        type: "string",
        format: "uuid",
        nullable: true,
      },
    },
  },
} as const;

export default schemas;
