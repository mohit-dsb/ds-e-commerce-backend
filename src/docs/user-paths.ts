// OpenAPI paths for User and Shipping Address endpoints

export const userPaths = {
  "/api/users/profile": {
    get: {
      tags: ["Users"],
      summary: "Get user profile",
      description: "Retrieve the authenticated user's profile information",
      operationId: "getUserProfile",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Profile retrieved successfully",
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
                    $ref: "#/components/schemas/User",
                  },
                },
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
    patch: {
      tags: ["Users"],
      summary: "Update user profile",
      description: "Update the authenticated user's profile information",
      operationId: "updateUserProfile",
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
              $ref: "#/components/schemas/UpdateUserProfileRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Profile updated successfully",
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
                    example: "Profile updated successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/User",
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

  "/api/users/change-password": {
    post: {
      tags: ["Users"],
      summary: "Change password",
      description: "Change the authenticated user's password",
      operationId: "changePassword",
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
              $ref: "#/components/schemas/ChangePasswordRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Password changed successfully",
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
                    example: "Password changed successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/User",
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

  "/api/users/cart": {
    get: {
      tags: ["Users"],
      summary: "Get user cart",
      description: "Retrieve the current user's shopping cart with items",
      operationId: "getUserCart",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "includeProduct",
          in: "query",
          description: "Include product details in response",
          required: false,
          schema: {
            type: "boolean",
            default: true,
          },
        },
      ],
      responses: {
        "200": {
          description: "Cart retrieved successfully",
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
                    example: "Cart retrieved successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/ShoppingCartWithItems",
                  },
                },
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
    delete: {
      tags: ["Users"],
      summary: "Clear cart",
      description: "Remove all items from the user's shopping cart",
      operationId: "clearCart",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Cart cleared successfully",
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
                    example: "Cart cleared successfully",
                  },
                },
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
  },

  "/api/users/cart/summary": {
    get: {
      tags: ["Users"],
      summary: "Get cart summary",
      description: "Get cart summary for the authenticated user",
      operationId: "getCartSummary",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Cart summary retrieved successfully",
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
                    example: "Cart summary retrieved successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/CartSummary",
                  },
                },
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
  },

  "/api/users/cart/items": {
    post: {
      tags: ["Users"],
      summary: "Add item to cart",
      description: "Add a product to the user's shopping cart",
      operationId: "addToCart",
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
              $ref: "#/components/schemas/AddToCartRequest",
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Item added to cart successfully",
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
                    example: "Item added to cart successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/ShoppingCartWithItems",
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

  "/api/users/cart/items/{itemId}": {
    patch: {
      tags: ["Users"],
      summary: "Update cart item quantity",
      description: "Update the quantity of a specific item in the cart",
      operationId: "updateCartItem",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "itemId",
          in: "path",
          description: "Cart item ID",
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
              $ref: "#/components/schemas/UpdateCartItemRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Cart item updated successfully",
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
                    example: "Cart item updated successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/ShoppingCartWithItems",
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
    delete: {
      tags: ["Users"],
      summary: "Remove item from cart",
      description: "Remove a specific item from the shopping cart",
      operationId: "removeFromCart",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "itemId",
          in: "path",
          description: "Cart item ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      responses: {
        "200": {
          description: "Item removed from cart successfully",
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
                    example: "Item removed from cart successfully",
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

  "/api/users/wishlist": {
    get: {
      tags: ["Users"],
      summary: "Get user wishlist",
      description: "Retrieve the authenticated user's wishlist with product details",
      operationId: "getUserWishlist",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Wishlist retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/WishlistResponse",
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
      tags: ["Users"],
      summary: "Add product to wishlist",
      description: "Add a product to the authenticated user's wishlist",
      operationId: "addToWishlist",
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
              $ref: "#/components/schemas/AddToWishlistRequest",
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Product added to wishlist successfully",
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
                    example: "Product added to wishlist successfully",
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
        "409": {
          description: "Product already in wishlist",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/responses/ConflictError",
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

  "/api/users/wishlist/check/{productId}": {
    get: {
      tags: ["Users"],
      summary: "Check if product is in wishlist",
      description: "Check if a specific product is in the authenticated user's wishlist",
      operationId: "checkWishlistStatus",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "productId",
          in: "path",
          description: "Product ID to check",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      responses: {
        "200": {
          description: "Wishlist status checked successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/WishlistStatusResponse",
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
  },

  "/api/users/wishlist/{productId}": {
    delete: {
      tags: ["Users"],
      summary: "Remove product from wishlist",
      description: "Remove a specific product from the authenticated user's wishlist",
      operationId: "removeFromWishlist",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "productId",
          in: "path",
          description: "Product ID to remove from wishlist",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      responses: {
        "200": {
          description: "Product removed from wishlist successfully",
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
                    example: "Product removed from wishlist successfully",
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
          description: "Product not found in wishlist",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/responses/NotFoundError",
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

export const shippingPaths = {
  "/api/shipping-addresses": {
    get: {
      tags: ["Shipping"],
      summary: "Get user shipping addresses",
      description: "Retrieve all shipping addresses for the authenticated user",
      operationId: "getUserShippingAddresses",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Shipping addresses retrieved successfully",
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
                      $ref: "#/components/schemas/ShippingAddress",
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
        "500": {
          $ref: "#/components/responses/InternalServerError",
        },
      },
    },
    post: {
      tags: ["Shipping"],
      summary: "Create shipping address",
      description: "Create a new shipping address for the authenticated user",
      operationId: "createShippingAddress",
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
              $ref: "#/components/schemas/CreateShippingAddressRequest",
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Shipping address created successfully",
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
                    example: "Shipping address created successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/ShippingAddress",
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

  "/api/shipping-addresses/{id}": {
    get: {
      tags: ["Shipping"],
      summary: "Get shipping address by ID",
      description: "Retrieve a specific shipping address by its ID",
      operationId: "getShippingAddressById",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Shipping address ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      responses: {
        "200": {
          description: "Shipping address retrieved successfully",
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
                    $ref: "#/components/schemas/ShippingAddress",
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
    patch: {
      tags: ["Shipping"],
      summary: "Update shipping address",
      description: "Update an existing shipping address",
      operationId: "updateShippingAddress",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Shipping address ID",
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
              $ref: "#/components/schemas/UpdateShippingAddressRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Shipping address updated successfully",
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
                    example: "Shipping address updated successfully",
                  },
                  data: {
                    $ref: "#/components/schemas/ShippingAddress",
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
    delete: {
      tags: ["Shipping"],
      summary: "Delete shipping address",
      description: "Delete an existing shipping address",
      operationId: "deleteShippingAddress",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Shipping address ID",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],
      responses: {
        "200": {
          description: "Shipping address deleted successfully",
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
                    example: "Shipping address deleted successfully",
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
} as const;

export default { ...userPaths, ...shippingPaths };
