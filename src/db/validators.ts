import z from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users, categories, products, passwordResets, orders, orderItems, shippingAddresses } from "./schema";

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: (schema) => schema.email().trim().toLowerCase(),
  password: (schema) => schema.min(8),
  firstName: (schema) => schema.min(1).trim(),
  lastName: (schema) => schema.min(1).trim(),
});

export const selectUserSchema = createSelectSchema(users);

export const insertCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").trim(),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().uuid().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8),
  firstName: z.string().min(1).trim(),
  lastName: z.string().min(1).trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim(),
  password: z.string().min(8),
});

export const updateCategorySchema = insertCategorySchema.partial();

export const selectCategorySchema = createSelectSchema(categories);

// Product validation schemas
export const insertProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters").trim(),
  description: z.string().trim().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid decimal with up to 2 decimal places"),
  weight: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/, "Weight must be a valid decimal with up to 3 decimal places")
    .optional(),
  weightUnit: z.enum(["kg", "g", "lb", "oz"]).optional(),
  status: z.enum(["draft", "active", "inactive", "discontinued"]).optional(),
  inventoryQuantity: z.number().int().min(0).optional(),
  images: z.array(z.string().url()).max(10, "Maximum 10 images allowed").optional(),
  tags: z.array(z.string().trim().min(1)).max(20, "Maximum 20 tags allowed").optional(),
  categoryId: z
    .string()
    .uuid(
      "Category ID must be a valid UUID format. Please provide a valid category ID. You can get available categories from GET /api/categories endpoint."
    ),
});

export const updateProductSchema = insertProductSchema.partial();

export const selectProductSchema = createSelectSchema(products);

// Product category association schema
export const productCategoryAssociationSchema = z.object({
  categoryId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
});

// Product search and filter schemas
export const productFiltersSchema = z.object({
  status: z.enum(["draft", "active", "inactive", "discontinued"]).optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  maxPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  inStock: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(["name", "price", "createdAt", "updatedAt", "inventoryQuantity", "rating"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Shipping address validation schemas
export const insertShippingAddressSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100).trim(),
  lastName: z.string().min(1, "Last name is required").max(100).trim(),
  company: z.string().max(100).trim().optional(),
  addressLine1: z.string().min(1, "Address line 1 is required").max(255).trim(),
  addressLine2: z.string().max(255).trim().optional(),
  city: z.string().min(1, "City is required").max(100).trim(),
  state: z.string().min(1, "State is required").max(100).trim(),
  postalCode: z.string().min(1, "Postal code is required").max(20).trim(),
  country: z.string().min(1, "Country is required").max(100).trim(),
  phoneNumber: z.string().max(20).trim().optional(),
  isDefault: z.boolean().optional(),
});

export const updateShippingAddressSchema = insertShippingAddressSchema.partial();

// Order validation schemas
export const createOrderItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(100, "Quantity cannot exceed 100"),
  productVariant: z
    .object({
      size: z.string().optional(),
      color: z.string().optional(),
      material: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
});

export const createOrderSchema = z.object({
  shippingAddressId: z.string().uuid("Invalid shipping address ID"),
  orderItems: z.array(createOrderItemSchema).min(1, "At least one order item is required"),
  shippingMethod: z.enum(["standard", "express", "free_shipping"]).optional(),
  customerNotes: z.string().max(1000).trim().optional(),
  paymentConfirmed: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded", "returned"]),
  comment: z.string().max(1000).trim().optional(),
  isCustomerVisible: z.boolean().optional(),
});

export const orderFiltersSchema = z.object({
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded", "returned"]).optional(),
  orderNumber: z.string().trim().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid minimum amount")
    .optional(),
  maxAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid maximum amount")
    .optional(),
  shippingMethod: z.enum(["standard", "express", "free_shipping"]).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "totalAmount", "orderNumber"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(1, "Cancellation reason is required").max(500, "Reason must be less than 500 characters"),
});

export const confirmPaymentSchema = z.object({
  comment: z.string().max(1000).trim().optional(),
  isCustomerVisible: z.boolean().optional(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type NewPasswordReset = typeof passwordResets.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ShippingAddress = typeof shippingAddresses.$inferSelect;
export type NewShippingAddress = typeof shippingAddresses.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

// ============================================================================
// Image Upload Validation Schemas
// ============================================================================

// Single image upload schema
export const uploadImageSchema = z.object({
  transformation: z
    .object({
      width: z.number().int().min(50).max(2000).optional(),
      height: z.number().int().min(50).max(2000).optional(),
      crop: z.enum(["fill", "fit", "limit", "scale", "pad", "crop"]).optional(),
      quality: z.union([z.literal("auto"), z.number().int().min(1).max(100)]).optional(),
      format: z.enum(["auto", "jpg", "png", "webp"]).optional(),
    })
    .optional(),
});

// Multiple images upload schema
export const uploadMultipleImagesSchema = z.object({
  transformation: z
    .object({
      width: z.number().int().min(50).max(2000).optional(),
      height: z.number().int().min(50).max(2000).optional(),
      crop: z.enum(["fill", "fit", "limit", "scale", "pad", "crop"]).optional(),
      quality: z.union([z.literal("auto"), z.number().int().min(1).max(100)]).optional(),
      format: z.enum(["auto", "jpg", "png", "webp"]).optional(),
    })
    .optional(),
  maxFiles: z.number().int().min(1).max(10).default(5),
});

// Product images update schema
export const updateProductImagesSchema = z.object({
  action: z.enum(["add", "remove", "replace"]),
  images: z.array(z.string().url()).max(10, "Maximum 10 images allowed").optional(),
  imagesToRemove: z.array(z.string()).optional(), // Public IDs to remove
});

// ============================================================================
// Shopping Cart Validation Schemas
// ============================================================================

// Add item to cart schema
export const addToCartSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(99, "Quantity cannot exceed 99"),
  productVariant: z
    .object({
      size: z.string().trim().optional(),
      color: z.string().trim().optional(),
      material: z.string().trim().optional(),
    })
    .catchall(z.unknown())
    .optional(),
});

// Update cart item quantity schema
export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(99, "Quantity cannot exceed 99"),
});

// Remove cart item schema
export const removeCartItemSchema = z.object({
  itemId: z.string().uuid("Invalid item ID"),
});

// Cart query parameters schema
export const cartQuerySchema = z.object({
  includeProduct: z.boolean().optional().default(true),
});

// ============================================================================
// User Profile Validation Schemas
// ============================================================================

// Update user profile schema
export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100).trim().optional(),
  lastName: z.string().min(1, "Last name is required").max(100).trim().optional(),
  email: z.string().email("Invalid email address").trim().toLowerCase().optional(),
});

// Change password schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ============================================================================
// Product Review Schemas
// ============================================================================

export const createReviewSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  rating: z.number().int("Rating must be an integer").min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters").trim().optional(),
  comment: z.string().max(2000, "Comment must be less than 2000 characters").trim().optional(),
  orderId: z.string().uuid("Invalid order ID").optional(),
  images: z.array(z.string().url("Invalid image URL")).max(5, "Maximum 5 images allowed").optional(),
});

export const updateReviewSchema = z.object({
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5")
    .optional(),
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters").trim().optional(),
  comment: z.string().max(2000, "Comment must be less than 2000 characters").trim().optional(),
  images: z.array(z.string().url("Invalid image URL")).max(5, "Maximum 5 images allowed").optional(),
});

export const reviewQuerySchema = z.object({
  rating: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(5))
    .optional(),
  sortBy: z.enum(["createdAt", "rating"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1))
    .default("1"),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .default("20"),
  includeUser: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .default("false"),
});
