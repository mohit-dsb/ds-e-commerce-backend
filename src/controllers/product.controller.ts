import type { Context } from "hono";
import type { NewProduct } from "@/db/validators";
import { createNotFoundError } from "@/utils/errors";
import { createSuccessResponse } from "@/utils/response";
import * as productService from "@/services/product.service";
import type { AuthContext } from "@/middleware/auth.middleware";
import { getValidatedData } from "@/middleware/validation.middleware";
import type { CreateProductRequest, ProductFilters, UpdateProductRequest } from "@/types/product.types";

// ============================================================================
// Product CRUD Operations
// ============================================================================

/**
 * Create a new product
 * POST /api/products
 * @param c - Hono context object
 * @returns Created product response
 */
export const createProduct = async (c: Context) => {
  const validatedData = getValidatedData<CreateProductRequest>(c, "json");
  const user = c.get("user") as AuthContext["user"];

  const productData = validatedData;

  const productDataForDb: Omit<NewProduct, "id" | "createdAt" | "updatedAt"> = {
    name: productData.name,
    description: productData.description ?? null,
    slug: productData.slug ?? "",
    price: productData.price,
    weight: productData.weight ?? null,
    weightUnit: productData.weightUnit ?? "kg",
    status: productData.status ?? "draft",
    inventoryQuantity: productData.inventoryQuantity ?? 0,
    allowBackorder: productData.allowBackorder ?? false,
    images: productData.images ?? [],
    tags: productData.tags ?? [],
    categoryId: productData.categoryId,
    createdBy: user.id,
  };

  const product = await productService.createProduct(productDataForDb);

  return c.json(createSuccessResponse("Product created successfully", { product }), 201);
};

/**
 * Get product by ID
 * GET /api/products/:id
 * @param c - Hono context object
 * @returns Product details response
 */
export const getProductById = async (c: Context) => {
  const id = c.req.param("id");
  const includeInactive = c.req.query("includeInactive") === "true";

  const product = await productService.getProductById(id, includeInactive);

  return c.json(createSuccessResponse("Product retrieved successfully", { product }));
};

/**
 * Get product by slug
 * GET /api/products/slug/:slug
 * @param c - Hono context object
 * @returns Product details response
 */
export const getProductBySlug = async (c: Context) => {
  const slug = c.req.param("slug");
  const includeInactive = c.req.query("includeInactive") === "true";

  const product = await productService.getProductBySlug(slug, includeInactive);

  return c.json(createSuccessResponse("Product retrieved successfully", { product }));
};

/**
 * Update a product
 * PUT /api/products/:id
 * @param c - Hono context object
 * @returns Updated product response
 */
export const updateProduct = async (c: Context) => {
  const id = c.req.param("id");
  const validatedData = getValidatedData<UpdateProductRequest>(c, "json");

  const productData = validatedData;

  // Remove undefined values
  const cleanProductData = Object.fromEntries(Object.entries(productData).filter(([_, value]) => value !== undefined)) as Partial<
    Omit<NewProduct, "id" | "createdAt" | "updatedAt">
  >;

  const product = await productService.updateProduct(id, cleanProductData);

  return c.json(createSuccessResponse("Product updated successfully", { product }));
};

/**
 * Delete a product
 * DELETE /api/products/:id
 * @param c - Hono context object
 * @returns Deletion confirmation response
 */
export const deleteProduct = async (c: Context) => {
  const id = c.req.param("id");

  await productService.deleteProduct(id);

  return c.json(createSuccessResponse("Product deleted successfully", { productId: id }));
};

// ============================================================================
// Product Query Operations
// ============================================================================

/**
 * Get all products with optional filtering
 * GET /api/products
 * @param c - Hono context object
 * @returns Paginated products response
 */
export const getProducts = async (c: Context) => {
  const query = c.req.query();

  const filters: ProductFilters = {
    status: query.status as ProductFilters["status"],
    categoryId: query.categoryId,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    inStock: query.inStock ? query.inStock === "true" : undefined,
    tags: query.tags ? query.tags.split(",") : undefined,
    search: query.search,
    sortBy: (query.sortBy as ProductFilters["sortBy"]) ?? "createdAt",
    sortOrder: (query.sortOrder as ProductFilters["sortOrder"]) ?? "desc",
    page: query.page ? parseInt(query.page, 10) : 1,
    limit: query.limit ? parseInt(query.limit, 10) : 20,
  };

  // Remove undefined values
  Object.keys(filters).forEach((key) => {
    if (filters[key as keyof ProductFilters] === undefined) {
      delete filters[key as keyof ProductFilters];
    }
  });

  const result = await productService.getProducts(filters);

  return c.json(createSuccessResponse("Products retrieved successfully", result));
};

/**
 * Get products by category
 * GET /api/products/category/:categoryId
 * @param c - Hono context object
 * @returns Filtered products by category response
 */
export const getProductsByCategory = async (c: Context) => {
  const categoryId = c.req.param("categoryId");
  const query = c.req.query();

  const filters: Omit<ProductFilters, "categoryId"> = {
    status: query.status as ProductFilters["status"],
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    inStock: query.inStock ? query.inStock === "true" : undefined,
    tags: query.tags ? query.tags.split(",") : undefined,
    search: query.search,
    sortBy: (query.sortBy as ProductFilters["sortBy"]) ?? "createdAt",
    sortOrder: (query.sortOrder as ProductFilters["sortOrder"]) ?? "desc",
    page: query.page ? parseInt(query.page, 10) : 1,
    limit: query.limit ? parseInt(query.limit, 10) : 20,
  };

  // Remove undefined values
  Object.keys(filters).forEach((key) => {
    if (filters[key as keyof typeof filters] === undefined) {
      delete filters[key as keyof typeof filters];
    }
  });

  const result = await productService.getProductsByCategory(categoryId, filters);

  return c.json(createSuccessResponse("Products retrieved successfully", result));
};

/**
 * Search products
 * GET /api/products/search
 * @param c - Hono context object
 * @returns Search results response
 */
export const searchProducts = async (c: Context) => {
  const query = c.req.query();
  const searchTerm = query.q ?? query.search;

  if (!searchTerm) {
    throw createNotFoundError("Search term is required");
  }

  const filters: Omit<ProductFilters, "search"> = {
    status: query.status as ProductFilters["status"],
    categoryId: query.categoryId,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    inStock: query.inStock ? query.inStock === "true" : undefined,
    tags: query.tags ? query.tags.split(",") : undefined,
    sortBy: (query.sortBy as ProductFilters["sortBy"]) ?? "createdAt",
    sortOrder: (query.sortOrder as ProductFilters["sortOrder"]) ?? "desc",
    page: query.page ? parseInt(query.page, 10) : 1,
    limit: query.limit ? parseInt(query.limit, 10) : 20,
  };

  // Remove undefined values
  Object.keys(filters).forEach((key) => {
    if (filters[key as keyof typeof filters] === undefined) {
      delete filters[key as keyof typeof filters];
    }
  });

  const result = await productService.searchProducts(searchTerm, filters);

  return c.json(createSuccessResponse("Products search completed successfully", result));
};

// ============================================================================
// Product Management Operations
// ============================================================================

/**
 * Get low stock products
 * GET /api/products/low-stock
 * @param c - Hono context object
 * @returns Low stock products response
 */
export const getLowStockProducts = async (c: Context) => {
  const threshold = c.req.query("threshold");

  const products = await productService.getLowStockProducts(threshold ? parseInt(threshold, 10) : undefined);

  return c.json(createSuccessResponse("Low stock products retrieved successfully", { products }));
};

/**
 * Bulk update product status
 * PATCH /api/products/bulk-status
 * @param c - Hono context object
 * @returns Bulk update confirmation response
 */
export const bulkUpdateProductStatus = async (c: Context) => {
  const { productIds, status } = getValidatedData<{
    productIds: string[];
    status: "draft" | "active" | "inactive" | "discontinued";
  }>(c, "json");

  await productService.bulkUpdateProductStatus(productIds, status);

  return c.json(createSuccessResponse("Product statuses updated successfully", { updatedCount: productIds.length }));
};
