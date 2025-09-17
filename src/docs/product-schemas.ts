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
      isActive: {
        type: "boolean",
        description: "Whether the product is active",
        example: true,
      },
      inventoryQuantity: {
        type: "integer",
        minimum: 0,
        description: "Available inventory quantity",
        example: 50,
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
      rating: {
        type: "string",
        pattern: "^\\d+(\\.\\d{1,2})?$",
        minimum: 0,
        maximum: 5,
        description: "Average product rating calculated from reviews",
        example: "4.50",
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
      isActive:{
        type: "boolean",
        default: true,
        description: "Whether the product is active",
      },
      inventoryQuantity: {
        type: "integer",
        minimum: 0,
        description: "Initial inventory quantity",
        example: 50,
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
      isActive:{
        type: "boolean",
        description: "Whether the product is active",
        example: true,
      },
      inventoryQuantity: {
        type: "integer",
        minimum: 0,
        example: 50,
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
      isActive:{
        type: "boolean",
        description: "Whether the products are active",
        example: true,
      }
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

  // ============================================================================
  // Product Review Schemas
  // ============================================================================

  ProductReview: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        description: "Review unique identifier",
        example: "123e4567-e89b-12d3-a456-426614174000",
      },
      productId: {
        type: "string",
        format: "uuid",
        description: "Product identifier",
        example: "123e4567-e89b-12d3-a456-426614174001",
      },
      userId: {
        type: "string",
        format: "uuid",
        description: "User identifier",
        example: "123e4567-e89b-12d3-a456-426614174002",
      },
      orderId: {
        type: "string",
        format: "uuid",
        nullable: true,
        description: "Order identifier (if from verified purchase)",
        example: "123e4567-e89b-12d3-a456-426614174003",
      },
      rating: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "Review rating from 1 to 5 stars",
        example: 5,
      },
      title: {
        type: "string",
        description: "Review title",
        example: "Excellent sound quality!",
      },
      comment: {
        type: "string",
        description: "Review comment/description",
        example:
          "These headphones exceeded my expectations. The sound quality is crystal clear and the noise cancellation works perfectly.",
      },
      isVerifiedPurchase: {
        type: "boolean",
        description: "Whether this review is from a verified purchase",
        example: true,
      },
      user: {
        type: "object",
        nullable: true,
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          firstName: {
            type: "string",
            example: "John",
          },
          lastName: {
            type: "string",
            example: "D.",
          },
          email: {
            type: "string",
            format: "email",
            example: "j***@example.com",
          },
        },
        description: "User information (included when requested)",
      },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "Review creation timestamp",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        description: "Review last update timestamp",
      },
    },
    required: ["id", "productId", "userId", "rating", "title", "comment", "isVerifiedPurchase", "createdAt", "updatedAt"],
  },

  CreateReviewRequest: {
    type: "object",
    properties: {
      rating: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "Review rating from 1 to 5 stars",
        example: 5,
      },
      title: {
        type: "string",
        minLength: 1,
        maxLength: 255,
        description: "Review title",
        example: "Excellent sound quality!",
      },
      comment: {
        type: "string",
        minLength: 1,
        maxLength: 2000,
        description: "Review comment/description",
        example:
          "These headphones exceeded my expectations. The sound quality is crystal clear and the noise cancellation works perfectly.",
      },
      orderId: {
        type: "string",
        format: "uuid",
        nullable: true,
        description: "Order ID for verified purchase (optional)",
        example: "123e4567-e89b-12d3-a456-426614174003",
      },
    },
    required: ["rating", "title", "comment"],
  },

  UpdateReviewRequest: {
    type: "object",
    properties: {
      rating: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "Review rating from 1 to 5 stars",
        example: 4,
      },
      title: {
        type: "string",
        minLength: 1,
        maxLength: 255,
        description: "Review title",
        example: "Great headphones with minor issues",
      },
      comment: {
        type: "string",
        minLength: 1,
        maxLength: 2000,
        description: "Review comment/description",
        example: "Good sound quality but the battery life could be better. Overall satisfied with the purchase.",
      },
    },
  },

  ReviewSummary: {
    type: "object",
    properties: {
      productId: {
        type: "string",
        format: "uuid",
        description: "Product identifier",
        example: "123e4567-e89b-12d3-a456-426614174001",
      },
      totalReviews: {
        type: "integer",
        description: "Total number of reviews",
        example: 127,
      },
      averageRating: {
        type: "number",
        format: "decimal",
        description: "Average rating (rounded to 2 decimal places)",
        example: 4.35,
      },
      ratingDistribution: {
        type: "object",
        properties: {
          "1": {
            type: "integer",
            description: "Number of 1-star reviews",
            example: 5,
          },
          "2": {
            type: "integer",
            description: "Number of 2-star reviews",
            example: 8,
          },
          "3": {
            type: "integer",
            description: "Number of 3-star reviews",
            example: 15,
          },
          "4": {
            type: "integer",
            description: "Number of 4-star reviews",
            example: 34,
          },
          "5": {
            type: "integer",
            description: "Number of 5-star reviews",
            example: 65,
          },
        },
        description: "Distribution of ratings by star count",
      },
      verifiedPurchaseCount: {
        type: "integer",
        description: "Number of reviews from verified purchases",
        example: 98,
      },
      verifiedPurchasePercentage: {
        type: "number",
        format: "decimal",
        description: "Percentage of verified purchase reviews",
        example: 77.17,
      },
    },
    required: [
      "productId",
      "totalReviews",
      "averageRating",
      "ratingDistribution",
      "verifiedPurchaseCount",
      "verifiedPurchasePercentage",
    ],
  },

  // ============================================================================
  // Product Image Schemas
  // ============================================================================

  ImageTransformation: {
    type: "object",
    properties: {
      width: {
        type: "integer",
        minimum: 50,
        maximum: 2000,
        description: "Image width in pixels",
        example: 800,
      },
      height: {
        type: "integer",
        minimum: 50,
        maximum: 2000,
        description: "Image height in pixels",
        example: 600,
      },
      crop: {
        type: "string",
        enum: ["fill", "fit", "limit", "scale", "pad", "crop"],
        description: "Image cropping mode",
        example: "fill",
      },
      quality: {
        oneOf: [
          {
            type: "string",
            enum: ["auto"],
          },
          {
            type: "integer",
            minimum: 1,
            maximum: 100,
          },
        ],
        description: "Image quality (1-100 or 'auto')",
        example: "auto",
      },
      format: {
        type: "string",
        enum: ["auto", "jpg", "png", "webp"],
        description: "Image format",
        example: "webp",
      },
    },
  },

  UploadImageRequest: {
    type: "object",
    properties: {
      transformation: {
        $ref: "#/components/schemas/ImageTransformation",
        description: "Optional image transformation parameters",
      },
    },
  },

  UploadMultipleImagesRequest: {
    type: "object",
    properties: {
      transformation: {
        $ref: "#/components/schemas/ImageTransformation",
        description: "Optional image transformation parameters applied to all images",
      },
      maxFiles: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        default: 5,
        description: "Maximum number of files to upload",
        example: 5,
      },
    },
  },

  UpdateProductImagesRequest: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "remove", "replace"],
        description: "Action to perform on product images",
        example: "add",
      },
      images: {
        type: "array",
        items: {
          type: "string",
          format: "uri",
        },
        maxItems: 10,
        description: "Array of image URLs to add or replace",
        example: ["https://cloudinary.com/image1.jpg", "https://cloudinary.com/image2.jpg"],
      },
      imagesToRemove: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Array of Cloudinary public IDs to remove",
        example: ["products/image1", "products/image2"],
      },
    },
    required: ["action"],
  },

  ImageUploadResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      message: {
        type: "string",
        example: "Image uploaded successfully",
      },
      data: {
        type: "object",
        properties: {
          publicId: {
            type: "string",
            description: "Cloudinary public ID",
            example: "products/iphone-15-pro-abc123",
          },
          url: {
            type: "string",
            format: "uri",
            description: "Image URL",
            example: "https://res.cloudinary.com/demo/image/upload/v123456789/products/iphone-15-pro-abc123.jpg",
          },
          secureUrl: {
            type: "string",
            format: "uri",
            description: "Secure HTTPS image URL",
            example: "https://res.cloudinary.com/demo/image/upload/v123456789/products/iphone-15-pro-abc123.jpg",
          },
          format: {
            type: "string",
            description: "Image format",
            example: "jpg",
          },
          width: {
            type: "integer",
            description: "Image width in pixels",
            example: 800,
          },
          height: {
            type: "integer",
            description: "Image height in pixels",
            example: 600,
          },
          bytes: {
            type: "integer",
            description: "Image file size in bytes",
            example: 245760,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Upload timestamp",
          },
        },
      },
    },
  },

  MultipleImagesUploadResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      message: {
        type: "string",
        example: "Images uploaded successfully",
      },
      data: {
        type: "object",
        properties: {
          images: {
            type: "array",
            items: {
              type: "object",
              properties: {
                publicId: {
                  type: "string",
                  description: "Cloudinary public ID",
                  example: "products/iphone-15-pro-abc123",
                },
                url: {
                  type: "string",
                  format: "uri",
                  description: "Image URL",
                  example: "https://res.cloudinary.com/demo/image/upload/v123456789/products/iphone-15-pro-abc123.jpg",
                },
                secureUrl: {
                  type: "string",
                  format: "uri",
                  description: "Secure HTTPS image URL",
                  example: "https://res.cloudinary.com/demo/image/upload/v123456789/products/iphone-15-pro-abc123.jpg",
                },
                format: {
                  type: "string",
                  description: "Image format",
                  example: "jpg",
                },
                width: {
                  type: "integer",
                  description: "Image width in pixels",
                  example: 800,
                },
                height: {
                  type: "integer",
                  description: "Image height in pixels",
                  example: 600,
                },
                bytes: {
                  type: "integer",
                  description: "Image file size in bytes",
                  example: 245760,
                },
                createdAt: {
                  type: "string",
                  format: "date-time",
                  description: "Upload timestamp",
                },
              },
            },
          },
          uploadedCount: {
            type: "integer",
            description: "Number of images uploaded",
            example: 3,
          },
        },
      },
    },
  },

  UpdateProductImagesResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      message: {
        type: "string",
        example: "Product images updated successfully",
      },
      data: {
        type: "object",
        properties: {
          productId: {
            type: "string",
            format: "uuid",
            description: "Product ID",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          action: {
            type: "string",
            enum: ["add", "remove", "replace"],
            description: "Action performed",
            example: "add",
          },
          imagesAdded: {
            type: "integer",
            description: "Number of images added",
            example: 2,
          },
          imagesRemoved: {
            type: "integer",
            description: "Number of images removed",
            example: 0,
          },
          currentImageCount: {
            type: "integer",
            description: "Current total number of images",
            example: 5,
          },
          images: {
            type: "array",
            items: {
              type: "string",
              format: "uri",
            },
            description: "Current product image URLs",
            example: [
              "https://res.cloudinary.com/demo/image/upload/v123456789/products/iphone-15-pro-abc123.jpg",
              "https://res.cloudinary.com/demo/image/upload/v123456789/products/iphone-15-pro-def456.jpg",
            ],
          },
        },
      },
    },
  },

  DeleteProductImageResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      message: {
        type: "string",
        example: "Product image deleted successfully",
      },
      data: {
        type: "object",
        properties: {
          productId: {
            type: "string",
            format: "uuid",
            description: "Product ID",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          publicId: {
            type: "string",
            description: "Cloudinary public ID of deleted image",
            example: "products/iphone-15-pro-abc123",
          },
          deleted: {
            type: "boolean",
            description: "Whether the image was successfully deleted",
            example: true,
          },
        },
      },
    },
  },
} as const;

export default productSchemas;
