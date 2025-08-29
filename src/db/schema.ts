import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar, boolean, pgEnum, integer, decimal, jsonb, check } from "drizzle-orm/pg-core";

// Define the role enum first
export const roleEnum = pgEnum("role", ["customer", "admin"]);

// Define product status enum
export const productStatusEnum = pgEnum("product_status", ["draft", "active", "inactive", "discontinued"]);

// Define order status enum
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "returned",
]);

// Define shipping method enum
export const shippingMethodEnum = pgEnum("shipping_method", ["standard", "express", "free_shipping"]);

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

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: text("token_hash").notNull().unique(), // Store hashed version for security
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  revokedAt: timestamp("revoked_at"),
  revokedBy: uuid("revoked_by").references(() => users.id, { onDelete: "set null" }), // Admin who revoked it
  parentTokenId: uuid("parent_token_id"), // Self-reference for token families - will add reference later
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }), // For device tracking
  ipAddress: varchar("ip_address", { length: 45 }), // Supports both IPv4 and IPv6
  userAgent: text("user_agent"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    weight: decimal("weight", { precision: 8, scale: 3 }),
    weightUnit: varchar("weight_unit", { length: 10 }).default("kg"),
    status: productStatusEnum("status").default("draft").notNull(),
    inventoryQuantity: integer("inventory_quantity").default(0),
    allowBackorder: boolean("allow_backorder").default(false).notNull(),
    images: jsonb("images").$type<string[]>().default([]),
    tags: jsonb("tags").$type<string[]>().default([]),
    categoryId: uuid("category_id")
      .references(() => categories.id, { onDelete: "restrict" })
      .notNull(),
    createdBy: uuid("created_by")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    {
      // Constraint to prevent negative inventory (unless backorders are allowed)
      inventoryNonNegative: check(
        "inventory_non_negative",
        sql`${table.inventoryQuantity} >= 0 OR ${table.allowBackorder} = true`
      ),
    },
  ]
);

// Shipping addresses table for flexible address management
export const shippingAddresses = pgTable("shipping_addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  company: varchar("company", { length: 100 }),
  addressLine1: varchar("address_line_1", { length: 255 }).notNull(),
  addressLine2: varchar("address_line_2", { length: 255 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Orders table - main order entity
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(), // Human-readable order number
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "restrict" })
    .notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),

  // Financial details
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  shippingAmount: decimal("shipping_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),

  // Shipping details
  shippingMethod: shippingMethodEnum("shipping_method").default("standard").notNull(),
  shippingAddressId: uuid("shipping_address_id")
    .references(() => shippingAddresses.id, { onDelete: "restrict" })
    .notNull(),

  // Tracking and notes
  trackingNumber: varchar("tracking_number", { length: 100 }),
  notes: text("notes"),
  customerNotes: text("customer_notes"),

  // Important timestamps
  confirmedAt: timestamp("confirmed_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  cancelledAt: timestamp("cancelled_at"),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Order items table - individual products within an order
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "restrict" })
    .notNull(),

  // Product details at time of order (for historical accuracy)
  productName: varchar("product_name", { length: 255 }).notNull(),
  productSlug: varchar("product_slug", { length: 255 }).notNull(),

  // Pricing and quantity
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),

  // Product variant details (stored as JSONB)
  productVariant: jsonb("product_variant").$type<{
    size?: string;
    color?: string;
    material?: string;
    [key: string]: unknown;
  }>(),

  // Fulfillment tracking
  isDigital: boolean("is_digital").default(false).notNull(),
  requiresShipping: boolean("requires_shipping").default(true).notNull(),
  weight: decimal("weight", { precision: 8, scale: 3 }),
  weightUnit: varchar("weight_unit", { length: 10 }).default("kg"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Order status history for tracking order lifecycle
export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  previousStatus: orderStatusEnum("previous_status"),
  newStatus: orderStatusEnum("new_status").notNull(),
  comment: text("comment"),
  changedBy: uuid("changed_by").references(() => users.id, { onDelete: "restrict" }),
  isCustomerVisible: boolean("is_customer_visible").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Shopping cart table for persistent cart functionality
export const shoppingCarts = pgTable("shopping_carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Shopping cart items
export const shoppingCartItems = pgTable("shopping_cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id")
    .references(() => shoppingCarts.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  quantity: integer("quantity").notNull(),
  productVariant: jsonb("product_variant").$type<{
    size?: string;
    color?: string;
    material?: string;
    [key: string]: unknown;
  }>(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  products: many(products),
}));

export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  refreshTokens: many(refreshTokens),
  passwordResets: many(passwordResets),
  products: many(products),
  shippingAddresses: many(shippingAddresses),
  orders: many(orders),
  shoppingCarts: many(shoppingCarts),
  orderStatusChanges: many(orderStatusHistory),
  revokedRefreshTokens: many(refreshTokens, { relationName: "revokedBy" }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one, many }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
  revokedBy: one(users, {
    fields: [refreshTokens.revokedBy],
    references: [users.id],
    relationName: "revokedBy",
  }),
  parentToken: one(refreshTokens, {
    fields: [refreshTokens.parentTokenId],
    references: [refreshTokens.id],
    relationName: "tokenFamily",
  }),
  childTokens: many(refreshTokens, { relationName: "tokenFamily" }),
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  createdBy: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  orderItems: many(orderItems),
  cartItems: many(shoppingCartItems),
}));

export const shippingAddressesRelations = relations(shippingAddresses, ({ one, many }) => ({
  user: one(users, {
    fields: [shippingAddresses.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  shippingAddress: one(shippingAddresses, {
    fields: [orders.shippingAddressId],
    references: [shippingAddresses.id],
  }),
  orderItems: many(orderItems),
  statusHistory: many(orderStatusHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
  changedBy: one(users, {
    fields: [orderStatusHistory.changedBy],
    references: [users.id],
  }),
}));

export const shoppingCartsRelations = relations(shoppingCarts, ({ one, many }) => ({
  user: one(users, {
    fields: [shoppingCarts.userId],
    references: [users.id],
  }),
  items: many(shoppingCartItems),
}));

export const shoppingCartItemsRelations = relations(shoppingCartItems, ({ one }) => ({
  cart: one(shoppingCarts, {
    fields: [shoppingCartItems.cartId],
    references: [shoppingCarts.id],
  }),
  product: one(products, {
    fields: [shoppingCartItems.productId],
    references: [products.id],
  }),
}));
