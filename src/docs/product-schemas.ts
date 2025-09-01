// Product and Order related schemas for OpenAPI specification

export const productSchemas = {
  // Product Schemas
  Product: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        description: "Unique product identifier",
        example: "123e4567-e89b-12d3-a456-426614174000",
      },
      name: {
        type: "string",
        description: "Product name",
        example: "iPhone 15 Pro",
      },
      slug: {
        type: "string",
        description: "URL-friendly product identifier",
        example: "iphone-15-pro",
      },
      description: {
        type: "string",
        nullable: true,
        description: "Product description",
        example: "Latest iPhone with advanced camera system",
      },
      price: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,2})?$",
        description: "Product price in decimal format",
        example: "999.99",
      },
      weight: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,3})?$",
        nullable: true,
        description: "Product weight",
        example: "0.174",
      },
      weightUnit: {
        type: "string",
        enum: ["kg", "g", "lb", "oz"],
        nullable: true,
        description: "Weight unit",
        example: "kg",
      },
      status: {
        type: "string",
        enum: ["draft", "active", "inactive", "discontinued"],
        description: "Product status",
        example: "active",
      },
      inventoryQuantity: {
        type: "integer",
        minimum: 0,
        description: "Available inventory quantity",
        example: 50,
      },
      allowBackorder: {
        type: "boolean",
        description: "Whether backorders are allowed",
        example: false,
      },
      images: {
        type: "array",
        items: {
          type: "string",
          format: "url",
        },
        maxItems: 10,
        description: "Product image URLs",
        example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
      },
      tags: {
        type: "array",
        items: {
          type: "string",
        },
        maxItems: 20,
        description: "Product tags",
        example: ["smartphone", "apple", "electronics"],
      },
      categoryId: {
        type: "string",
        format: "uuid",
        description: "Associated category ID",
        example: "123e4567-e89b-12d3-a456-426614174001",
      },
      category: {
        $ref: "#/components/schemas/Category",
        description: "Associated category (when included)",
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

  CreateProductRequest: {
    type: "object",
    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: 255,
        description: "Product name",
        example: "iPhone 15 Pro",
      },
      description: {
        type: "string",
        description: "Product description",
        example: "Latest iPhone with advanced camera system",
      },
      price: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,2})?$",
        description: "Product price in decimal format",
        example: "999.99",
      },
      weight: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,3})?$",
        description: "Product weight",
        example: "0.174",
      },
      weightUnit: {
        type: "string",
        enum: ["kg", "g", "lb", "oz"],
        description: "Weight unit",
        example: "kg",
      },
      status: {
        type: "string",
        enum: ["draft", "active", "inactive", "discontinued"],
        default: "draft",
        description: "Product status",
      },
      inventoryQuantity: {
        type: "integer",
        minimum: 0,
        description: "Initial inventory quantity",
        example: 50,
      },
      allowBackorder: {
        type: "boolean",
        default: false,
        description: "Whether backorders are allowed",
      },
      images: {
        type: "array",
        items: {
          type: "string",
          format: "url",
        },
        maxItems: 10,
        description: "Product image URLs",
        example: ["https://example.com/image1.jpg"],
      },
      tags: {
        type: "array",
        items: {
          type: "string",
        },
        maxItems: 20,
        description: "Product tags",
        example: ["smartphone", "apple", "electronics"],
      },
      categoryId: {
        type: "string",
        format: "uuid",
        description: "Category ID to associate with the product",
        example: "123e4567-e89b-12d3-a456-426614174001",
      },
    },
    required: ["name", "price", "categoryId"],
  },

  UpdateProductRequest: {
    type: "object",
    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: 255,
        example: "iPhone 15 Pro",
      },
      description: {
        type: "string",
        example: "Latest iPhone with advanced camera system",
      },
      price: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,2})?$",
        example: "999.99",
      },
      weight: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,3})?$",
        example: "0.174",
      },
      weightUnit: {
        type: "string",
        enum: ["kg", "g", "lb", "oz"],
        example: "kg",
      },
      status: {
        type: "string",
        enum: ["draft", "active", "inactive", "discontinued"],
      },
      inventoryQuantity: {
        type: "integer",
        minimum: 0,
        example: 50,
      },
      allowBackorder: {
        type: "boolean",
      },
      images: {
        type: "array",
        items: {
          type: "string",
          format: "url",
        },
        maxItems: 10,
      },
      tags: {
        type: "array",
        items: {
          type: "string",
        },
        maxItems: 20,
      },
      categoryId: {
        type: "string",
        format: "uuid",
      },
    },
  },

  BulkUpdateProductStatusRequest: {
    type: "object",
    properties: {
      productIds: {
        type: "array",
        items: {
          type: "string",
          format: "uuid",
        },
        minItems: 1,
        description: "Array of product IDs to update",
        example: ["123e4567-e89b-12d3-a456-426614174000", "123e4567-e89b-12d3-a456-426614174001"],
      },
      status: {
        type: "string",
        enum: ["draft", "active", "inactive", "discontinued"],
        description: "New status for all specified products",
        example: "active",
      },
    },
    required: ["productIds", "status"],
  },

  // Shipping Address Schemas
  ShippingAddress: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        description: "Unique address identifier",
        example: "123e4567-e89b-12d3-a456-426614174000",
      },
      firstName: {
        type: "string",
        description: "First name",
        example: "John",
      },
      lastName: {
        type: "string",
        description: "Last name",
        example: "Doe",
      },
      company: {
        type: "string",
        nullable: true,
        description: "Company name",
        example: "Acme Corp",
      },
      addressLine1: {
        type: "string",
        description: "Primary address line",
        example: "123 Main Street",
      },
      addressLine2: {
        type: "string",
        nullable: true,
        description: "Secondary address line",
        example: "Apt 4B",
      },
      city: {
        type: "string",
        description: "City",
        example: "New York",
      },
      state: {
        type: "string",
        description: "State or province",
        example: "NY",
      },
      postalCode: {
        type: "string",
        description: "Postal or ZIP code",
        example: "10001",
      },
      country: {
        type: "string",
        description: "Country",
        example: "United States",
      },
      phoneNumber: {
        type: "string",
        nullable: true,
        description: "Phone number",
        example: "+1-555-123-4567",
      },
      isDefault: {
        type: "boolean",
        description: "Whether this is the default address",
        example: true,
      },
      userId: {
        type: "string",
        format: "uuid",
        description: "Associated user ID",
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

  CreateShippingAddressRequest: {
    type: "object",
    properties: {
      firstName: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        description: "First name",
        example: "John",
      },
      lastName: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        description: "Last name",
        example: "Doe",
      },
      company: {
        type: "string",
        maxLength: 100,
        description: "Company name",
        example: "Acme Corp",
      },
      addressLine1: {
        type: "string",
        minLength: 1,
        maxLength: 255,
        description: "Primary address line",
        example: "123 Main Street",
      },
      addressLine2: {
        type: "string",
        maxLength: 255,
        description: "Secondary address line",
        example: "Apt 4B",
      },
      city: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        description: "City",
        example: "New York",
      },
      state: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        description: "State or province",
        example: "NY",
      },
      postalCode: {
        type: "string",
        minLength: 1,
        maxLength: 20,
        description: "Postal or ZIP code",
        example: "10001",
      },
      country: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        description: "Country",
        example: "United States",
      },
      phoneNumber: {
        type: "string",
        maxLength: 20,
        description: "Phone number",
        example: "+1-555-123-4567",
      },
      isDefault: {
        type: "boolean",
        default: false,
        description: "Whether this should be the default address",
      },
    },
    required: ["firstName", "lastName", "addressLine1", "city", "state", "postalCode", "country"],
  },

  UpdateShippingAddressRequest: {
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
      company: {
        type: "string",
        maxLength: 100,
        example: "Acme Corp",
      },
      addressLine1: {
        type: "string",
        minLength: 1,
        maxLength: 255,
        example: "123 Main Street",
      },
      addressLine2: {
        type: "string",
        maxLength: 255,
        example: "Apt 4B",
      },
      city: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        example: "New York",
      },
      state: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        example: "NY",
      },
      postalCode: {
        type: "string",
        minLength: 1,
        maxLength: 20,
        example: "10001",
      },
      country: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        example: "United States",
      },
      phoneNumber: {
        type: "string",
        maxLength: 20,
        example: "+1-555-123-4567",
      },
      isDefault: {
        type: "boolean",
      },
    },
  },
} as const;

export default productSchemas;
