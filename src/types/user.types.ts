import { z } from "zod";
import type {
  addToCartSchema,
  updateCartItemSchema,
  removeCartItemSchema,
  cartQuerySchema,
  updateUserProfileSchema,
  changePasswordSchema,
} from "@/db/validators";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "@/db/schema";

// ============================================================================
// User Service Types
// ============================================================================

export const createUserSchema = createInsertSchema(users, {
  email: (s) => s.trim().toLowerCase(),
  password: (s) => s.trim(),
  firstName: (s) => s.trim(),
  lastName: (s) => s.trim(),
});
export const selectUserSchema = createSelectSchema(users);
export const publicUserSchema = selectUserSchema.omit({ password: true });
export const loginSchema = selectUserSchema.pick({ email: true, password: true });
export const resetPasswordSchema = z.object({
  token: z.string().trim(),
  password: z.string().min(8),
});

export type ICreateUser = z.infer<typeof createUserSchema>;
export type IUser = z.infer<typeof selectUserSchema>;
export type IPublicUser = z.infer<typeof publicUserSchema>;
export type ILogin = z.infer<typeof loginSchema>;
export type IResetPassword = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// Cart Types
// ============================================================================

export type AddToCartRequest = z.infer<typeof addToCartSchema>;
export type UpdateCartItemRequest = z.infer<typeof updateCartItemSchema>;
export type RemoveCartItemRequest = z.infer<typeof removeCartItemSchema>;
export type CartQueryRequest = z.infer<typeof cartQuerySchema>;

// Product variant interface for cart items
export interface ProductVariant {
  size?: string;
  color?: string;
  material?: string;
  [key: string]: unknown;
}

// Cart item with product details
export interface CartItemWithProduct {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  productVariant?: ProductVariant;
  addedAt: Date;
  updatedAt: Date;
  product?: {
    id: string;
    name: string;
    slug: string;
    price: string;
    images: string[];
    isActive: boolean;
    inventoryQuantity: number;
    weight?: string | null;
    weightUnit?: string;
  };
}

// Shopping cart with items
export interface ShoppingCartWithItems {
  id: string;
  userId: string;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: CartItemWithProduct[];
  summary: {
    totalItems: number;
    totalQuantity: number;
    subtotal: string;
    estimatedTax?: string;
    estimatedTotal?: string;
  };
}

// Cart summary for quick calculations
export interface CartSummary {
  totalItems: number;
  totalQuantity: number;
  subtotal: string;
  estimatedTax?: string;
  estimatedTotal?: string;
}

// ============================================================================
// User Profile Types
// ============================================================================

export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;

// ============================================================================
// Service Response Types
// ============================================================================

// Generic service response
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

// Cart operation results
export interface CartOperationResult {
  cart: ShoppingCartWithItems;
  message: string;
}

// ============================================================================
// Database Entity Types
// ============================================================================

// Raw cart entity from database
export interface CartEntity {
  id: string;
  userId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Raw cart item entity from database
export interface CartItemEntity {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  productVariant?: ProductVariant | null;
  addedAt: Date;
  updatedAt: Date;
}

// Combined cart with items for database operations
export interface CartWithItemsEntity {
  cart: CartEntity;
  items: CartItemEntity[];
}
