import { pgTable, text, timestamp, uuid, varchar, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Define the role enum first
export const roleEnum = pgEnum("role", ["customer", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  role: roleEnum("role").default("customer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  parentId: uuid("parent_id"),
  createdBy: uuid("created_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories),
  createdBy: one(users, {
    fields: [categories.createdBy],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  sessions: many(sessions),
  passwordResets: many(passwordResets),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type NewPasswordReset = typeof passwordResets.$inferInsert;
