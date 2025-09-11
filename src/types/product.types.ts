import type { z } from "zod";
import type { Product, createReviewSchema, updateReviewSchema, reviewQuerySchema } from "@/db/validators";

export interface ProductFilters {
  status?: "draft" | "active" | "inactive" | "discontinued";
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  tags?: string[];
  search?: string;
  sortBy?: "name" | "price" | "createdAt" | "updatedAt" | "inventoryQuantity" | "rating";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ProductWithRelations extends Product {
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  additionalCategories?: {
    id: string;
    name: string;
    slug: string;
    isPrimary: boolean;
  }[];
}

// Types for validation
export interface CreateProductRequest {
  name: string;
  description?: string;
  slug?: string;
  price: string;
  weight?: string;
  weightUnit?: "kg" | "g" | "lb" | "oz";
  status?: "draft" | "active" | "inactive" | "discontinued";
  inventoryQuantity?: number;
  images?: string[];
  tags?: string[];
  categoryId: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  slug?: string;
  price?: string;
  weight?: string;
  weightUnit?: "kg" | "g" | "lb" | "oz";
  status?: "draft" | "active" | "inactive" | "discontinued";
  inventoryQuantity?: number;
  images?: string[];
  tags?: string[];
  categoryId?: string;
}

export interface ProductFilters {
  status?: "draft" | "active" | "inactive" | "discontinued";
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  tags?: string[];
  search?: string;
  sortBy?: "name" | "price" | "createdAt" | "updatedAt" | "inventoryQuantity" | "rating";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// Image upload types
export interface UpdateProductImagesRequest {
  action: "add" | "remove" | "replace";
  images?: string[];
  imagesToRemove?: string[];
}

// ============================================================================
// Product Review Types
// ============================================================================

// Review Request Types
export type CreateReviewRequest = z.infer<typeof createReviewSchema>;
export type UpdateReviewRequest = z.infer<typeof updateReviewSchema>;
export type ReviewQueryRequest = z.infer<typeof reviewQuerySchema>;

// Review Response Types
export interface ReviewUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ReviewProduct {
  id: string;
  name: string;
  slug: string;
  images?: string[];
}

export interface ProductReview {
  id: string;
  userId: string;
  productId: string;
  orderId?: string | null;
  rating: number;
  title?: string | null;
  comment?: string | null;
  isVerifiedPurchase: boolean;
  images?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  user?: ReviewUser;
  product?: ReviewProduct;
}

export interface ReviewWithRelations extends ProductReview {
  user: ReviewUser;
  product?: ReviewProduct;
}

export interface ReviewOperationResult {
  review: ProductReview;
  message: string;
}

export interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPurchaseCount: number;
}

export interface ReviewFilters {
  rating?: number;
  sortBy?: "createdAt" | "rating";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  includeUser?: boolean;
}
