// ============================================================================
// User Service Types
// ============================================================================

import type { z } from "zod";
import type {
  addToCartSchema,
  updateCartItemSchema,
  removeCartItemSchema,
  cartQuerySchema,
  updateUserProfileSchema,
  changePasswordSchema,
} from "@/db/validators";

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
    status: string;
    inventoryQuantity: number;
    allowBackorder: boolean;
    weight?: string | null;
    weightUnit?: string;
  };
}

// Shopping cart with items
export interface ShoppingCartWithItems {
  id: string;
  userId: string;
  sessionId?: string | null;
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

// User profile response
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null; // Phone numbers are stored in shipping addresses
  role: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

// User operation results
export interface UserOperationResult {
  user: UserProfile;
  message: string;
}

// ============================================================================
// Database Entity Types
// ============================================================================

// Raw cart entity from database
export interface CartEntity {
  id: string;
  userId: string | null;
  sessionId: string | null;
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
