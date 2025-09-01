// Order and Cart related schemas for OpenAPI specification

export const orderSchemas = {
  // Order Item Schema
  OrderItem: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        description: "Unique order item identifier",
        example: "123e4567-e89b-12d3-a456-426614174000",
      },
      orderId: {
        type: "string",
        format: "uuid",
        description: "Associated order ID",
      },
      productId: {
        type: "string",
        format: "uuid",
        description: "Product ID",
        example: "123e4567-e89b-12d3-a456-426614174001",
      },
      quantity: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Quantity ordered",
        example: 2,
      },
      unitPrice: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,2})?$",
        description: "Price per unit at time of order",
        example: "999.99",
      },
      totalPrice: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,2})?$",
        description: "Total price for this item (quantity × unitPrice)",
        example: "1999.98",
      },
      productVariant: {
        type: "object",
        nullable: true,
        properties: {
          size: {
            type: "string",
            example: "Large",
          },
          color: {
            type: "string",
            example: "Blue",
          },
          material: {
            type: "string",
            example: "Cotton",
          },
        },
        additionalProperties: true,
        description: "Product variant options selected",
      },
      product: {
        $ref: "#/components/schemas/Product",
        description: "Product details (when included)",
      },
      createdAt: {
        type: "string",
        format: "date-time",
      },
    },
  },

  // Order Schema
  Order: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        description: "Unique order identifier",
        example: "123e4567-e89b-12d3-a456-426614174000",
      },
      orderNumber: {
        type: "string",
        description: "Human-readable order number",
        example: "ORD-2024-001234",
      },
      userId: {
        type: "string",
        format: "uuid",
        description: "Customer user ID",
      },
      status: {
        type: "string",
        enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded", "returned"],
        description: "Current order status",
        example: "confirmed",
      },
      subtotalAmount: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,2})?$",
        description: "Subtotal before taxes and shipping",
        example: "1999.98",
      },
      taxAmount: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,2})?$",
        description: "Tax amount",
        example: "159.99",
      },
      shippingAmount: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,2})?$",
        description: "Shipping cost",
        example: "9.99",
      },
      totalAmount: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,2})?$",
        description: "Total order amount",
        example: "2169.96",
      },
      shippingMethod: {
        type: "string",
        enum: ["standard", "express", "free_shipping"],
        description: "Selected shipping method",
        example: "standard",
      },
      shippingAddressId: {
        type: "string",
        format: "uuid",
        description: "Shipping address ID",
      },
      customerNotes: {
        type: "string",
        nullable: true,
        maxLength: 1000,
        description: "Customer notes for the order",
        example: "Please deliver after 5 PM",
      },
      trackingNumber: {
        type: "string",
        nullable: true,
        description: "Shipping tracking number",
        example: "TRK123456789",
      },
      metadata: {
        type: "object",
        nullable: true,
        additionalProperties: true,
        description: "Additional order metadata",
      },
      orderItems: {
        type: "array",
        items: {
          $ref: "#/components/schemas/OrderItem",
        },
        description: "Items in this order",
      },
      shippingAddress: {
        $ref: "#/components/schemas/ShippingAddress",
        description: "Shipping address details (when included)",
      },
      user: {
        $ref: "#/components/schemas/User",
        description: "Customer details (when included)",
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

  // Create Order Request
  CreateOrderItemRequest: {
    type: "object",
    properties: {
      productId: {
        type: "string",
        format: "uuid",
        description: "Product ID to order",
        example: "123e4567-e89b-12d3-a456-426614174001",
      },
      quantity: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Quantity to order",
        example: 2,
      },
      productVariant: {
        type: "object",
        properties: {
          size: {
            type: "string",
            example: "Large",
          },
          color: {
            type: "string",
            example: "Blue",
          },
          material: {
            type: "string",
            example: "Cotton",
          },
        },
        additionalProperties: true,
        description: "Product variant options",
      },
    },
    required: ["productId", "quantity"],
  },

  CreateOrderRequest: {
    type: "object",
    properties: {
      shippingAddressId: {
        type: "string",
        format: "uuid",
        description: "Shipping address ID",
        example: "123e4567-e89b-12d3-a456-426614174002",
      },
      orderItems: {
        type: "array",
        items: {
          $ref: "#/components/schemas/CreateOrderItemRequest",
        },
        minItems: 1,
        description: "Items to include in the order",
      },
      shippingMethod: {
        type: "string",
        enum: ["standard", "express", "free_shipping"],
        default: "standard",
        description: "Preferred shipping method",
      },
      customerNotes: {
        type: "string",
        maxLength: 1000,
        description: "Optional customer notes",
        example: "Please deliver after 5 PM",
      },
      metadata: {
        type: "object",
        additionalProperties: true,
        description: "Additional order metadata",
      },
    },
    required: ["shippingAddressId", "orderItems"],
  },

  UpdateOrderStatusRequest: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded", "returned"],
        description: "New order status",
        example: "shipped",
      },
      comment: {
        type: "string",
        maxLength: 1000,
        description: "Optional comment about the status change",
        example: "Order shipped via FedEx",
      },
      trackingNumber: {
        type: "string",
        maxLength: 100,
        description: "Tracking number for shipped orders",
        example: "TRK123456789",
      },
      isCustomerVisible: {
        type: "boolean",
        default: true,
        description: "Whether this status update is visible to the customer",
      },
    },
    required: ["status"],
  },

  CancelOrderRequest: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        minLength: 1,
        maxLength: 500,
        description: "Reason for cancellation",
        example: "Customer requested cancellation due to changed requirements",
      },
    },
    required: ["reason"],
  },

  // Cart Schemas
  CartItem: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        description: "Unique cart item identifier",
        example: "123e4567-e89b-12d3-a456-426614174000",
      },
      userId: {
        type: "string",
        format: "uuid",
        description: "User ID who owns this cart item",
      },
      productId: {
        type: "string",
        format: "uuid",
        description: "Product ID",
        example: "123e4567-e89b-12d3-a456-426614174001",
      },
      quantity: {
        type: "integer",
        minimum: 1,
        maximum: 99,
        description: "Quantity in cart",
        example: 2,
      },
      productVariant: {
        type: "object",
        nullable: true,
        properties: {
          size: {
            type: "string",
            example: "Large",
          },
          color: {
            type: "string",
            example: "Blue",
          },
          material: {
            type: "string",
            example: "Cotton",
          },
        },
        additionalProperties: true,
        description: "Selected product variant options",
      },
      product: {
        $ref: "#/components/schemas/Product",
        description: "Product details (when included)",
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

  AddToCartRequest: {
    type: "object",
    properties: {
      productId: {
        type: "string",
        format: "uuid",
        description: "Product ID to add to cart",
        example: "123e4567-e89b-12d3-a456-426614174001",
      },
      quantity: {
        type: "integer",
        minimum: 1,
        maximum: 99,
        description: "Quantity to add",
        example: 2,
      },
      productVariant: {
        type: "object",
        properties: {
          size: {
            type: "string",
            example: "Large",
          },
          color: {
            type: "string",
            example: "Blue",
          },
          material: {
            type: "string",
            example: "Cotton",
          },
        },
        additionalProperties: true,
        description: "Product variant options",
      },
    },
    required: ["productId", "quantity"],
  },

  UpdateCartItemRequest: {
    type: "object",
    properties: {
      quantity: {
        type: "integer",
        minimum: 1,
        maximum: 99,
        description: "New quantity for the cart item",
        example: 3,
      },
    },
    required: ["quantity"],
  },

  CartSummary: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          $ref: "#/components/schemas/CartItem",
        },
        description: "Items in the cart",
      },
      summary: {
        type: "object",
        properties: {
          itemCount: {
            type: "integer",
            description: "Total number of items in cart",
            example: 3,
          },
          totalQuantity: {
            type: "integer",
            description: "Total quantity of all items",
            example: 5,
          },
          subtotal: {
            type: "string",
            pattern: "^\\d+(\\.\\d{1,2})?$",
            description: "Subtotal of all items",
            example: "1999.95",
          },
          estimatedTax: {
            type: "string",
            pattern: "^\\d+(\\.\\d{1,2})?$",
            description: "Estimated tax amount",
            example: "159.99",
          },
          estimatedTotal: {
            type: "string",
            pattern: "^\\d+(\\.\\d{1,2})?$",
            description: "Estimated total including tax",
            example: "2159.94",
          },
        },
      },
    },
  },
} as const;

export default orderSchemas;
