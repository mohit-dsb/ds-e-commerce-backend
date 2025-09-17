import type { Context } from "hono";
import type { NewProduct } from "@/db/validators";
import { createSuccessResponse } from "@/utils/response";
import { createNotFoundError } from "@/utils/errors";
import * as productService from "@/services/product.service";
import type { AuthContext } from "@/middleware/auth.middleware";
import { getValidatedData } from "@/middleware/validation.middleware";
import type {
  CreateProductRequest,
  ProductFilters,
  UpdateProductRequest,
  ReviewFilters,
  CreateReviewRequest,
  UpdateReviewRequest,
} from "@/types/product.types";

// ============================================================================
// Product Controller Functions
// ============================================================================

/**
 * Create a new product
 * POST /api/products
 */
export const createProduct = async (c: Context<{ Variables: AuthContext }>) => {
  const validatedData = getValidatedData<CreateProductRequest>(c, "json");
  const user = c.get("user");

  const productDataForDb: Omit<NewProduct, "id" | "createdAt" | "updatedAt"> = {
    name: validatedData.name,
    description: validatedData.description ?? null,
    slug: validatedData.slug ?? "",
    price: validatedData.price,
    weight: validatedData.weight ?? null,
    weightUnit: validatedData.weightUnit ?? "kg",
    isActive: validatedData.isActive ?? true,
    inventoryQuantity: validatedData.inventoryQuantity ?? 0,
    images: validatedData.images ?? [],
    tags: validatedData.tags ?? [],
    categoryId: validatedData.categoryId,
    createdBy: user.id,
  };

  const product = await productService.createProduct(productDataForDb);

  return c.json(createSuccessResponse("Product created successfully", { product }), 201);
};

/**
 * Get product by ID
 * GET /api/products/:id
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
 */
export const getProductBySlug = async (c: Context) => {
  const slug = c.req.param("slug");
  const includeInactive = c.req.query("includeInactive") === "true";

  const product = await productService.getProductBySlug(slug, includeInactive);

  return c.json(createSuccessResponse("Product retrieved successfully", { product }));
};

/**
 * Update a product
 * PATCH /api/products/:id
 */
export const updateProduct = async (c: Context) => {
  const id = c.req.param("id");
  const validatedData = getValidatedData<UpdateProductRequest>(c, "json");

  // Remove undefined values
  const cleanProductData = Object.fromEntries(
    Object.entries(validatedData).filter(([_, value]) => value !== undefined)
  ) as Partial<Omit<NewProduct, "id" | "createdAt" | "updatedAt">>;

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
    isActive: query.isActive ? query.isActive === "true" : true,
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
    isActive: query.isActive ? query.isActive === "true" : true,
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
    isActive: query.isActive ? query.isActive === "true" : true,
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
  const { productIds, isActive } = getValidatedData<{
    productIds: string[];
    isActive: boolean;
  }>(c, "json");

  await productService.bulkUpdateProductStatus(productIds, isActive);

  return c.json(createSuccessResponse("Product statuses updated successfully", { updatedCount: productIds.length }));
};

// ============================================================================
// Product Review Controller Functions
// ============================================================================

/**
 * Create a new product review
 * POST /api/products/:productId/reviews
 */
export const createProductReview = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");
  const productId = c.req.param("productId");
  const reviewData = getValidatedData<Omit<CreateReviewRequest, "productId">>(c, "json");

  const result = await productService.createProductReview(user.id, {
    ...reviewData,
    productId,
  });

  return c.json(createSuccessResponse(result.message, { review: result.review }), 201);
};

/**
 * Update a product review
 * PATCH /api/products/:productId/reviews/:reviewId
 */
export const updateProductReview = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");
  const reviewId = c.req.param("reviewId");
  const updateData = getValidatedData<UpdateReviewRequest>(c, "json");

  const result = await productService.updateProductReview(reviewId, user.id, updateData);

  return c.json(createSuccessResponse(result.message, { review: result.review }));
};

/**
 * Delete a product review
 * DELETE /api/products/:productId/reviews/:reviewId
 */
export const deleteProductReview = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");
  const reviewId = c.req.param("reviewId");

  await productService.deleteProductReview(reviewId, user.id);

  return c.json(createSuccessResponse("Review deleted successfully", { reviewId }));
};

/**
 * Get reviews for a product
 * GET /api/products/:productId/reviews
 */
export const getProductReviews = async (c: Context) => {
  const productId = c.req.param("productId");
  const query = c.req.query();

  const filters: ReviewFilters = {
    rating: query.rating ? parseInt(query.rating, 10) : undefined,
    sortBy: (query.sortBy as ReviewFilters["sortBy"]) ?? "createdAt",
    sortOrder: (query.sortOrder as ReviewFilters["sortOrder"]) ?? "desc",
    page: query.page ? parseInt(query.page, 10) : 1,
    limit: query.limit ? parseInt(query.limit, 10) : 20,
  };

  // Remove undefined values
  Object.keys(filters).forEach((key) => {
    if (filters[key as keyof ReviewFilters] === undefined) {
      delete filters[key as keyof ReviewFilters];
    }
  });

  const result = await productService.getProductReviews(productId, filters);

  return c.json(createSuccessResponse("Product reviews retrieved successfully", result));
};

/**
 * Get review summary for a product
 * GET /api/products/:productId/reviews/summary
 */
export const getProductReviewSummary = async (c: Context) => {
  const productId = c.req.param("productId");

  const summary = await productService.getProductReviewSummary(productId);

  return c.json(createSuccessResponse("Product review summary retrieved successfully", { summary }));
};

/**
 * Get a specific review by ID
 * GET /api/products/:productId/reviews/:reviewId
 */
export const getProductReviewById = async (c: Context) => {
  const reviewId = c.req.param("reviewId");

  const review = await productService.getProductReviewById(reviewId);

  return c.json(createSuccessResponse("Review retrieved successfully", { review }));
};
