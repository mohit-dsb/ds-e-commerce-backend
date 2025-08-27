import z from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { passwordResets, sessions, users, categories } from "./schema";

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
  slug: z
    .string()
    .max(100, "Slug must be less than 100 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .trim()
    .optional(), // Slug is now optional - will be generated from name if not provided
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type PasswordReset = typeof passwordResets.$inferSelect;
