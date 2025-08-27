import type { Product } from "@/db/validators";

export interface ProductFilters {
  status?: "draft" | "active" | "inactive" | "discontinued";
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  tags?: string[];
  search?: string;
  sortBy?: "name" | "price" | "createdAt" | "updatedAt" | "inventoryQuantity";
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
  shortDescription?: string;
  slug?: string;
  sku?: string;
  price: string;
  costPerItem?: string;
  weight?: string;
  weightUnit?: "kg" | "g" | "lb" | "oz";
  status?: "draft" | "active" | "inactive" | "discontinued";
  inventoryQuantity?: number;
  allowBackorder?: boolean;
  images?: string[];
  tags?: string[];
  categoryId?: string;
  additionalCategoryIds?: string[];
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  shortDescription?: string;
  slug?: string;
  sku?: string;
  price?: string;
  costPerItem?: string;
  weight?: string;
  weightUnit?: "kg" | "g" | "lb" | "oz";
  status?: "draft" | "active" | "inactive" | "discontinued";
  inventoryQuantity?: number;
  allowBackorder?: boolean;
  images?: string[];
  tags?: string[];
  categoryId?: string;
  additionalCategoryIds?: string[];
}

export interface ProductFilters {
  status?: "draft" | "active" | "inactive" | "discontinued";
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  tags?: string[];
  search?: string;
  sortBy?: "name" | "price" | "createdAt" | "updatedAt" | "inventoryQuantity";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}
