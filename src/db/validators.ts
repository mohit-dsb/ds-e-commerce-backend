import z from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { passwordResets, sessions, users, categories } from "./schema";

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: (schema) => schema.email(),
  password: (schema) => schema.min(8),
  firstName: (schema) => schema.min(1),
  lastName: (schema) => schema.min(1),
});

export const selectUserSchema = createSelectSchema(users);

export const insertCategorySchema = createInsertSchema(categories, {
  name: (schema) => schema.min(1).max(100),
  slug: (schema) =>
    schema
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: (schema) => schema.optional(),
  parentId: (schema) => schema.optional(),
}).omit({ id: true, createdBy: true, createdAt: true, updatedAt: true });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
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
