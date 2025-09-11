// OpenAPI paths for Order endpoints

export const orderPaths = {
  "/api/orders": {
    get: {
      tags: ["Orders"],
      summary: "Get user orders",
      description: "Retrieve orders for the authenticated user with filtering and pagination",
      operationId: "getUserOrders",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "status",
          in: "query",
          description: "Filter by order status",
          required: false,
          schema: {
            type: "string",
            enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded", "returned"],
          },
        },
        {
          name: "orderNumber",
          in: "query",
          description: "Search by order number",
          required: false,
          schema: {
            type: "string",
          },
        },
        {
          name: "dateFrom",
          in: "query",
          description: "Filter orders from this date",
          required: false,
          schema: {
            type: "string",
            format: "date",
          },
        },
        {
          name: "dateTo",
          in: "query",
          description: "Filter orders to this date",
          required: false,
          schema: {
            type: "string",
            format: "date",
          },
        },
        {
          name: "minAmount",
          in: "query",
          description: "Filter by minimum order amount",
          required: false,
          schema: {
            type: "string",
            pattern: "^\\d+(\\.\\d{1,2})?$",
          },
        },
        {
          name: "maxAmount",
          in: "query",
          description: "Filter by maximum order amount",
          required: false,
          schema: {
            type: "string",
            pattern: "^\\d+(\\.\\d{1,2})?$",
          },
        },
        {
          name: "shippingMethod",
          in: "query",
          description: "Filter by shipping method",
          required: false,
          schema: {
            type: "string",
            enum: ["standard", "express", "free_shipping"],
          },
        },
        {
          name: "sortBy",
          in: "query",
          description: "Sort by field",
          required: false,
          schema: {
            type: "string",
            enum: ["createdAt", "updatedAt", "totalAmount", "orderNumber"],
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
          description: "Orders retrieved successfully",
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
                          $ref: "#/components/schemas/Order",
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
        },
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
    post: {
      tags: ["Orders"],
      summary: "Create a new order",
      description: "Create a new order for the authenticated user",
      operationId: "createOrder",
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
              $ref: "#/components/schemas/CreateOrderRequest",
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Order created successfully",
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
                    example: "Order created successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/Order",
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
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },

  "/api/orders/{id}": {
    get: {
      tags: ["Orders"],
      summary: "Get order by ID",
      description: "Retrieve a specific order by its ID",
      operationId: "getOrderById",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Order ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      responses: {
        "200": {
          description: "Order retrieved successfully",
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
                    $ref: "#/components/schemas/Order",
                  },
                },
              },
            },
          },
        },
        "401": {
          $ref: "#/components/responses/UnauthorizedError",
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

  "/api/orders/{id}/status": {
    patch: {
      tags: ["Orders"],
      summary: "Update order status",
      description: "Update the status of an order (Admin only)",
      operationId: "updateOrderStatus",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Order ID",
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
              $ref: "#/components/schemas/UpdateOrderStatusRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Order status updated successfully",
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
                    example: "Order status updated successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/Order",
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
  },

  "/api/orders/{id}/cancel": {
    patch: {
      tags: ["Orders"],
      summary: "Cancel an order",
      description: "Cancel an order (customer or admin)",
      operationId: "cancelOrder",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Order ID",
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
              $ref: "#/components/schemas/CancelOrderRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Order cancelled successfully",
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
                    example: "Order cancelled successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/Order",
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
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },
  "/orders/{id}/confirm-payment": {
    patch: {
      tags: ["Orders"],
      summary: "Confirm payment for an order",
      description: "Confirm payment for an order (admin only)",
      operationId: "confirmPayment",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Order ID",
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
              $ref: "#/components/schemas/ConfirmPaymentRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Payment confirmed successfully",
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
                    example: "Payment confirmed successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/Order",
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
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
  },
} as const;

export default orderPaths;
