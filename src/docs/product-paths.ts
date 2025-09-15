// OpenAPI paths for Product endpoints

export const productPaths = {
  "/api/products": {
    get: {
      tags: ["Products"],
      summary: "Get all products",
      description: "Retrieve products with optional filtering, sorting, and pagination",
      operationId: "getProducts",
      parameters: [
        {
          name: "status",
          in: "query",
          description: "Filter by product status",
          required: false,
          schema: {
            type: "string",
            enum: ["draft", "active", "inactive", "discontinued"],
          },
        },
        {
          name: "categoryId",
          in: "query",
          description: "Filter by category ID",
          required: false,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
        {
          name: "minPrice",
          in: "query",
          description: "Minimum price filter",
          required: false,
          schema: {
            type: "string",
            pattern: "^\\d+(\\.\\d{1,2})?$",
          },
        },
        {
          name: "maxPrice",
          in: "query",
          description: "Maximum price filter",
          required: false,
          schema: {
            type: "string",
            pattern: "^\\d+(\\.\\d{1,2})?$",
          },
        },
        {
          name: "inStock",
          in: "query",
          description: "Filter by stock availability",
          required: false,
          schema: {
            type: "boolean",
          },
        },
        {
          name: "tags",
          in: "query",
          description: "Comma-separated list of tags",
          required: false,
          schema: {
            type: "string",
          },
        },
        {
          name: "search",
          in: "query",
          description: "Search term for name, description",
          required: false,
          schema: {
            type: "string",
          },
        },
        {
          name: "sortBy",
          in: "query",
          description: "Sort by field",
          required: false,
          schema: {
            type: "string",
            enum: ["name", "price", "createdAt", "updatedAt", "inventoryQuantity", "rating"],
            default: "createdAt",
          },
        },
        {
          $ref: "#/components/parameters/SortOrderParam",
        },
        {
          $ref: "#/components/parameters/PageParam",
        },
        {
          $ref: "#/components/parameters/LimitParam",
        },
      ],
      responses: {
        "200": {
          description: "Products retrieved successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  {
                    $ref: "#/components/schemas/PaginatedResponse",
                  },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/Product",
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        "400": {
          $ref: "#/components/responses/ValidationError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
    post: {
      tags: ["Products"],
      summary: "Create a new product",
      description: "Create a new product (Admin only)",
      operationId: "createProduct",
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CreateProductRequest",
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Product created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Product created successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/Product",
                  },
                },
              },
            },
          },
        },
        "400": {
          $ref: "#/components/responses/ValidationError",
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "403": {
          $ref: "#/components/responses/ForbiddenError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  "/api/products/{id}": {
    get: {
      tags: ["Products"],
      summary: "Get product by ID",
      description: "Retrieve a specific product by its ID",
      operationId: "getProductById",
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Product ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
        {
          name: "includeInactive",
          in: "query",
          description: "Include inactive products (admin only)",
          required: false,
          schema: {
            type: "boolean",
            default: false,
          },
        },
      ],
      responses: {
        "200": {
          description: "Product retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  data: {
                    $ref: "#/components/schemas/Product",
                  },
                },
              },
            },
          },
        },
        "404": {
          $ref: "#/components/responses/NotFoundError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
    patch: {
      tags: ["Products"],
      summary: "Update a product",
      description: "Update an existing product (Admin only)",
      operationId: "updateProduct",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Product ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdateProductRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Product updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Product updated successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/Product",
                  },
                },
              },
            },
          },
        },
        "400": {
          $ref: "#/components/responses/ValidationError",
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "403": {
          $ref: "#/components/responses/ForbiddenError",
        },
        "404": {
          $ref: "#/components/responses/NotFoundError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
    delete: {
      tags: ["Products"],
      summary: "Delete a product",
      description: "Delete an existing product (Admin only)",
      operationId: "deleteProduct",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Product ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      responses: {
        "200": {
          description: "Product deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Product deleted successfully",
                  },
                },
              },
            },
          },
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "403": {
          $ref: "#/components/responses/ForbiddenError",
        },
        "404": {
          $ref: "#/components/responses/NotFoundError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  "/api/products/search": {
    get: {
      tags: ["Products"],
      summary: "Search products",
      description: "Search products by term with filtering and pagination",
      operationId: "searchProducts",
      parameters: [
        {
          name: "q",
          in: "query",
          description: "Search term (required)",
          required: true,
          schema: {
            type: "string",
            minLength: 1,
          },
        },
        {
          name: "status",
          in: "query",
          description: "Filter by product status",
          required: false,
          schema: {
            type: "string",
            enum: ["draft", "active", "inactive", "discontinued"],
          },
        },
        {
          name: "categoryId",
          in: "query",
          description: "Filter by category ID",
          required: false,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
        {
          name: "minPrice",
          in: "query",
          description: "Minimum price filter",
          required: false,
          schema: {
            type: "string",
            pattern: "^\\d+(\\.\\d{1,2})?$",
          },
        },
        {
          name: "maxPrice",
          in: "query",
          description: "Maximum price filter",
          required: false,
          schema: {
            type: "string",
            pattern: "^\\d+(\\.\\d{1,2})?$",
          },
        },
        {
          name: "inStock",
          in: "query",
          description: "Filter by stock availability",
          required: false,
          schema: {
            type: "boolean",
          },
        },
        {
          name: "tags",
          in: "query",
          description: "Comma-separated list of tags",
          required: false,
          schema: {
            type: "string",
          },
        },
        {
          name: "sortBy",
          in: "query",
          description: "Sort by field",
          required: false,
          schema: {
            type: "string",
            enum: ["name", "price", "createdAt", "updatedAt", "inventoryQuantity", "rating"],
            default: "createdAt",
          },
        },
        {
          $ref: "#/components/parameters/SortOrderParam",
        },
        {
          $ref: "#/components/parameters/PageParam",
        },
        {
          $ref: "#/components/parameters/LimitParam",
        },
      ],
      responses: {
        "200": {
          description: "Search results retrieved successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  {
                    $ref: "#/components/schemas/PaginatedResponse",
                  },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/Product",
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        "400": {
          $ref: "#/components/responses/ValidationError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  "/api/products/slug/{slug}": {
    get: {
      tags: ["Products"],
      summary: "Get product by slug",
      description: "Retrieve a specific product by its slug",
      operationId: "getProductBySlug",
      parameters: [
        {
          name: "slug",
          in: "path",
          description: "Product slug",
          required: true,
          schema: {
            type: "string",
          },
        },
        {
          name: "includeInactive",
          in: "query",
          description: "Include inactive products (admin only)",
          required: false,
          schema: {
            type: "boolean",
            default: false,
          },
        },
      ],
      responses: {
        "200": {
          description: "Product retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  data: {
                    $ref: "#/components/schemas/Product",
                  },
                },
              },
            },
          },
        },
        "404": {
          $ref: "#/components/responses/NotFoundError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  "/api/products/category/{categoryId}": {
    get: {
      tags: ["Products"],
      summary: "Get products by category",
      description: "Retrieve products filtered by category with pagination",
      operationId: "getProductsByCategory",
      parameters: [
        {
          name: "categoryId",
          in: "path",
          description: "Category ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
        {
          name: "status",
          in: "query",
          description: "Filter by product status",
          required: false,
          schema: {
            type: "string",
            enum: ["draft", "active", "inactive", "discontinued"],
          },
        },
        {
          name: "minPrice",
          in: "query",
          description: "Minimum price filter",
          required: false,
          schema: {
            type: "string",
            pattern: "^\\d+(\\.\\d{1,2})?$",
          },
        },
        {
          name: "maxPrice",
          in: "query",
          description: "Maximum price filter",
          required: false,
          schema: {
            type: "string",
            pattern: "^\\d+(\\.\\d{1,2})?$",
          },
        },
        {
          name: "inStock",
          in: "query",
          description: "Filter by stock availability",
          required: false,
          schema: {
            type: "boolean",
          },
        },
        {
          name: "sortBy",
          in: "query",
          description: "Sort by field",
          required: false,
          schema: {
            type: "string",
            enum: ["name", "price", "createdAt", "updatedAt", "inventoryQuantity", "rating"],
            default: "createdAt",
          },
        },
        {
          $ref: "#/components/parameters/SortOrderParam",
        },
        {
          $ref: "#/components/parameters/PageParam",
        },
        {
          $ref: "#/components/parameters/LimitParam",
        },
      ],
      responses: {
        "200": {
          description: "Products retrieved successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  {
                    $ref: "#/components/schemas/PaginatedResponse",
                  },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/Product",
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        "404": {
          $ref: "#/components/responses/NotFoundError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  "/api/products/low-stock": {
    get: {
      tags: ["Products"],
      summary: "Get low stock products",
      description: "Retrieve products with low inventory levels (Admin only)",
      operationId: "getLowStockProducts",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "threshold",
          in: "query",
          description: "Stock threshold",
          required: false,
          schema: {
            type: "integer",
            minimum: 0,
            default: 5,
          },
        },
      ],
      responses: {
        "200": {
          description: "Low stock products retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  data: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/Product",
                    },
                  },
                },
              },
            },
          },
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "403": {
          $ref: "#/components/responses/ForbiddenError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  "/api/products/bulk-status": {
    patch: {
      tags: ["Products"],
      summary: "Bulk update product status",
      description: "Update status for multiple products (Admin only)",
      operationId: "bulkUpdateProductStatus",
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/BulkUpdateProductStatusRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Products updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Products updated successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      updatedCount: {
                        type: "integer",
                        example: 5,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          $ref: "#/components/responses/ValidationError",
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "403": {
          $ref: "#/components/responses/ForbiddenError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  // ============================================================================
  // Product Review Endpoints
  // ============================================================================

  "/api/products/{productId}/reviews": {
    get: {
      tags: ["Product Reviews"],
      summary: "Get product reviews",
      description: "Retrieve all reviews for a specific product with filtering and pagination",
      operationId: "getProductReviews",
      parameters: [
        {
          name: "productId",
          in: "path",
          description: "Product ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
        {
          name: "rating",
          in: "query",
          description: "Filter by rating (1-5)",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 5,
          },
        },
        {
          name: "sortBy",
          in: "query",
          description: "Sort by field",
          required: false,
          schema: {
            type: "string",
            enum: ["createdAt", "rating"],
            default: "createdAt",
          },
        },
        {
          $ref: "#/components/parameters/SortOrderParam",
        },
        {
          $ref: "#/components/parameters/PageParam",
        },
        {
          $ref: "#/components/parameters/LimitParam",
        },
      ],
      responses: {
        "200": {
          description: "Reviews retrieved successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  {
                    $ref: "#/components/schemas/PaginatedResponse",
                  },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          reviews: {
                            type: "array",
                            items: {
                              $ref: "#/components/schemas/ProductReview",
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        "404": {
          $ref: "#/components/responses/NotFoundError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
    post: {
      tags: ["Product Reviews"],
      summary: "Create product review",
      description: "Create a new review for a product (Authenticated users only)",
      operationId: "createProductReview",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "productId",
          in: "path",
          description: "Product ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CreateReviewRequest",
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Review created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Review submitted successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      review: {
                        $ref: "#/components/schemas/ProductReview",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          $ref: "#/components/responses/ValidationError",
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "404": {
          $ref: "#/components/responses/NotFoundError",
        },
        "409": {
          $ref: "#/components/responses/ConflictError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  "/api/products/{productId}/reviews/summary": {
    get: {
      tags: ["Product Reviews"],
      summary: "Get product review summary",
      description: "Get aggregated review statistics for a product",
      operationId: "getProductReviewSummary",
      parameters: [
        {
          name: "productId",
          in: "path",
          description: "Product ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      responses: {
        "200": {
          description: "Review summary retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Product review summary retrieved successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      summary: {
                        $ref: "#/components/schemas/ReviewSummary",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "404": {
          $ref: "#/components/responses/NotFoundError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  "/api/products/{productId}/reviews/{reviewId}": {
    get: {
      tags: ["Product Reviews"],
      summary: "Get specific review",
      description: "Retrieve a specific review by ID",
      operationId: "getProductReviewById",
      parameters: [
        {
          name: "productId",
          in: "path",
          description: "Product ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
        {
          name: "reviewId",
          in: "path",
          description: "Review ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      responses: {
        "200": {
          description: "Review retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Review retrieved successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      review: {
                        $ref: "#/components/schemas/ProductReview",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "404": {
          $ref: "#/components/responses/NotFoundError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
    patch: {
      tags: ["Product Reviews"],
      summary: "Update product review",
      description: "Update an existing review (Author only)",
      operationId: "updateProductReview",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "productId",
          in: "path",
          description: "Product ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
        {
          name: "reviewId",
          in: "path",
          description: "Review ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdateReviewRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Review updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Review updated successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      review: {
                        $ref: "#/components/schemas/ProductReview",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          $ref: "#/components/responses/ValidationError",
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "403": {
          $ref: "#/components/responses/ForbiddenError",
        },
        "404": {
          $ref: "#/components/responses/NotFoundError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
    delete: {
      tags: ["Product Reviews"],
      summary: "Delete product review",
      description: "Delete an existing review (Author only)",
      operationId: "deleteProductReview",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "productId",
          in: "path",
          description: "Product ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
        {
          name: "reviewId",
          in: "path",
          description: "Review ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      responses: {
        "200": {
          description: "Review deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Review deleted successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      reviewId: {
                        type: "string",
                        format: "uuid",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "403": {
          $ref: "#/components/responses/ForbiddenError",
        },
        "404": {
          $ref: "#/components/responses/NotFoundError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  // ============================================================================
  // Product Image Management Endpoints
  // ============================================================================

  "/api/products/upload-image": {
    post: {
      tags: ["Product Images"],
      summary: "Upload single product image",
      description: "Upload a single product image to Cloudinary with optional transformations (Admin only)",
      operationId: "uploadProductImage",
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                image: {
                  type: "string",
                  format: "binary",
                  description: "Image file to upload (JPEG, PNG, WebP, max 10MB)",
                },
                transformation: {
                  type: "string",
                  description: "JSON string of transformation parameters",
                  example: '{"width": 800, "height": 600, "crop": "fill", "quality": "auto"}',
                },
              },
              required: ["image"],
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Image uploaded successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ImageUploadResponse",
              },
            },
          },
        },
        "400": {
          $ref: "#/components/responses/ValidationError",
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "403": {
          $ref: "#/components/responses/ForbiddenError",
        },
        "413": {
          description: "File too large",
          content: {
            "application/json": {
              schema: {
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
                        example: "FILE_TOO_LARGE",
                      },
                      message: {
                        type: "string",
                        example: "File size exceeds 10MB limit",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "415": {
          description: "Unsupported file type",
          content: {
            "application/json": {
              schema: {
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
                        example: "UNSUPPORTED_FILE_TYPE",
                      },
                      message: {
                        type: "string",
                        example: "Only JPEG, PNG, and WebP files are supported",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  "/api/products/upload-images": {
    post: {
      tags: ["Product Images"],
      summary: "Upload multiple product images",
      description: "Upload multiple product images to Cloudinary in batch with optional transformations (Admin only)",
      operationId: "uploadProductImages",
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                images: {
                  type: "array",
                  items: {
                    type: "string",
                    format: "binary",
                  },
                  description: "Array of image files to upload (JPEG, PNG, WebP, max 10 files, 10MB each)",
                  maxItems: 10,
                },
                transformation: {
                  type: "string",
                  description: "JSON string of transformation parameters applied to all images",
                  example: '{"width": 800, "height": 600, "crop": "fill", "quality": "auto"}',
                },
                maxFiles: {
                  type: "integer",
                  description: "Maximum number of files to upload",
                  minimum: 1,
                  maximum: 10,
                  default: 5,
                },
              },
              required: ["images"],
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Images uploaded successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/MultipleImagesUploadResponse",
              },
            },
          },
        },
        "400": {
          $ref: "#/components/responses/ValidationError",
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "403": {
          $ref: "#/components/responses/ForbiddenError",
        },
        "413": {
          description: "Files too large",
          content: {
            "application/json": {
              schema: {
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
                        example: "FILES_TOO_LARGE",
                      },
                      message: {
                        type: "string",
                        example: "One or more files exceed the 10MB limit",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "415": {
          description: "Unsupported file types",
          content: {
            "application/json": {
              schema: {
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
                        example: "UNSUPPORTED_FILE_TYPES",
                      },
                      message: {
                        type: "string",
                        example: "Only JPEG, PNG, and WebP files are supported",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  "/api/products/{id}/images": {
    patch: {
      tags: ["Product Images"],
      summary: "Update product images",
      description: "Add, remove, or replace product images (Admin only)",
      operationId: "updateProductImages",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Product ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdateProductImagesRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Product images updated successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateProductImagesResponse",
              },
            },
          },
        },
        "400": {
          $ref: "#/components/responses/ValidationError",
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "403": {
          $ref: "#/components/responses/ForbiddenError",
        },
        "404": {
          $ref: "#/components/responses/NotFoundError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  "/api/products/{id}/images/{publicId}": {
    delete: {
      tags: ["Product Images"],
      summary: "Delete product image",
      description: "Delete a specific product image by Cloudinary public ID (Admin only)",
      operationId: "deleteProductImage",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Product ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
        {
          name: "publicId",
          in: "path",
          description: "Cloudinary public ID of the image to delete",
          required: true,
          schema: {
            type: "string",
            example: "products/iphone-15-pro-abc123",
          },
        },
      ],
      responses: {
        "200": {
          description: "Product image deleted successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/DeleteProductImageResponse",
              },
            },
          },
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "403": {
          $ref: "#/components/responses/ForbiddenError",
        },
        "404": {
          description: "Product or image not found",
          content: {
            "application/json": {
              schema: {
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
                        example: "NOT_FOUND",
                      },
                      message: {
                        type: "string",
                        example: "Product not found or image does not belong to this product",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },
} as const;

export default productPaths;
