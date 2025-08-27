import z from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users, categories, products, sessions, passwordResets } from "./schema";

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
  allowBackorder: z.boolean().optional(),
  images: z.array(z.string().url()).max(10, "Maximum 10 images allowed").optional(),
  tags: z.array(z.string().trim().min(1)).max(20, "Maximum 20 tags allowed").optional(),
  categoryId: z.string().uuid("Category is required and must be valid"),
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
  sortBy: z.enum(["name", "price", "createdAt", "updatedAt", "inventoryQuantity"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type NewPasswordReset = typeof passwordResets.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
