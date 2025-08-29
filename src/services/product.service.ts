import { db } from "@/db";
import { logger } from "@/utils/logger";
import type { NewProduct } from "@/db/validators";
import { products, categories } from "@/db/schema";
import { dbErrorHandlers } from "@/utils/database-errors";
import { generateSlug, generateUniqueSlug } from "@/utils/slug";
import type { ProductFilters, ProductWithRelations } from "@/types/product.types";
import { createNotFoundError, createConflictError, createValidationError } from "@/utils/errors";
import { eq, and, or, ilike, gte, lte, inArray, desc, asc, sql, count, type SQL } from "drizzle-orm";

// ============================================================================
// Product CRUD Operations
// ============================================================================

/**
 * Create a new product with automatic slug generation
 * @param productData - Product data without ID and timestamps
 * @returns Promise resolving to created product with relations
 */
export const createProduct = async (
  productData: Omit<NewProduct, "id" | "createdAt" | "updatedAt">
): Promise<ProductWithRelations> => {
  return dbErrorHandlers.create(async () => {
    // Always generate slug from product name for consistency and SEO
    const baseSlug = generateSlug(productData.name);

    const slugExists = async (slug: string): Promise<boolean> => {
      const existing = await db.select({ slug: products.slug }).from(products).where(eq(products.slug, slug)).limit(1);
      return existing.length > 0;
    };

    const finalSlug = await generateUniqueSlug(baseSlug, slugExists);

    // Check if product with same name already exists
    const existingByName = await db.select().from(products).where(eq(products.name, productData.name)).limit(1);
    if (existingByName.length > 0) {
      throw createConflictError("Product with this name already exists");
    }

    // Validate category exists
    const categoryExists = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, productData.categoryId))
      .limit(1);

    if (categoryExists.length === 0) {
      throw createValidationError([{ field: "categoryId", message: "Primary category does not exist" }]);
    }

    // Insert the product (no transaction - using sequential operations)
    const [newProduct] = await db
      .insert(products)
      .values({
        ...productData,
        slug: finalSlug,
      })
      .returning();

    // Fetch and return the complete product with relations
    return await getProductById(newProduct.id);
  });
};

/**
 * Update an existing product with automatic slug regeneration
 * @param id - Product ID to update
 * @param updateData - Partial product data to update
 * @returns Promise resolving to updated product with relations
 */
export const updateProduct = async (
  id: string,
  updateData: Partial<Omit<NewProduct, "id" | "createdAt" | "updatedAt">>
): Promise<ProductWithRelations> => {
  return dbErrorHandlers.update(async () => {
    // Check if product exists
    const existingProduct = await getProductById(id, true);

    // Prepare the final update data
    const finalUpdateData: Partial<NewProduct> = { ...updateData };

    // Always regenerate slug if name is updated for consistency and SEO
    if (updateData.name && updateData.name !== existingProduct.name) {
      const baseSlug = generateSlug(updateData.name);

      const slugExists = async (slug: string): Promise<boolean> => {
        const existing = await db
          .select({ slug: products.slug })
          .from(products)
          .where(and(eq(products.slug, slug), sql`${products.id} != ${id}`))
          .limit(1);
        return existing.length > 0;
      };

      finalUpdateData.slug = await generateUniqueSlug(baseSlug, slugExists);
    }

    // Check for conflicts if name is being updated
    if (finalUpdateData.name && finalUpdateData.name !== existingProduct.name) {
      const conflictingProduct = await db
        .select()
        .from(products)
        .where(and(eq(products.name, finalUpdateData.name), sql`${products.id} != ${id}`))
        .limit(1);

      if (conflictingProduct.length > 0) {
        throw createConflictError("Product with this name already exists");
      }
    }

    // Validate category if being updated
    if (finalUpdateData.categoryId && finalUpdateData.categoryId !== existingProduct.categoryId) {
      const categoryExists = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, finalUpdateData.categoryId))
        .limit(1);
      if (categoryExists.length === 0) {
        throw createValidationError([{ field: "categoryId", message: "Primary category does not exist" }]);
      }
    }

    // Update the product (no transaction needed for single operation)
    await db
      .update(products)
      .set({
        ...finalUpdateData,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    // Return the updated product with relations
    return await getProductById(id, true);
  });
};

/**
 * Delete a product (soft delete by setting status to discontinued)
 * @param id - Product ID to delete
 */
export const deleteProduct = async (id: string): Promise<void> => {
  return dbErrorHandlers.delete(async () => {
    const existingProduct = await getProductById(id, true);

    await db
      .update(products)
      .set({
        status: "discontinued",
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    logger.info("Product deleted successfully", {
      metadata: {
        productId: id,
        productName: existingProduct.name,
      },
    });
  });
};

// ============================================================================
// Product Retrieval Operations
// ============================================================================

/**
 * Get product by ID with relations
 * @param id - Product ID to retrieve
 * @param includeInactive - Whether to include inactive products
 * @returns Promise resolving to product with relations
 */
export const getProductById = async (id: string, includeInactive = false): Promise<ProductWithRelations> => {
  return dbErrorHandlers.read(async () => {
    const conditions = [eq(products.id, id)];
    if (!includeInactive) {
      conditions.push(eq(products.status, "active"));
    }

    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        slug: products.slug,
        price: products.price,
        weight: products.weight,
        weightUnit: products.weightUnit,
        status: products.status,
        inventoryQuantity: products.inventoryQuantity,
        allowBackorder: products.allowBackorder,
        images: products.images,
        tags: products.tags,
        categoryId: products.categoryId,
        createdBy: products.createdBy,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .limit(1);

    if (!product) {
      throw createNotFoundError("Product not found");
    }

    return {
      ...product,
      additionalCategories: [], // No additional categories with simplified model
    };
  });
};

/**
 * Get product by slug with relations
 * @param slug - Product slug to retrieve
 * @param includeInactive - Whether to include inactive products
 * @returns Promise resolving to product with relations
 */
export const getProductBySlug = async (slug: string, includeInactive = false): Promise<ProductWithRelations> => {
  return dbErrorHandlers.read(async () => {
    const conditions = [eq(products.slug, slug)];
    if (!includeInactive) {
      conditions.push(eq(products.status, "active"));
    }

    const [product] = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .limit(1);

    if (!product) {
      throw createNotFoundError("Product not found");
    }

    return await getProductById(product.id, includeInactive);
  });
};

/**
 * Get products with filtering, sorting, and pagination
 * @param filters - Product filtering options
 * @returns Promise resolving to paginated products with metadata
 */
export const getProducts = async (
  filters: ProductFilters = {}
): Promise<{
  products: ProductWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  return dbErrorHandlers.read(async () => {
    const {
      status = "active",
      categoryId,
      minPrice,
      maxPrice,
      inStock,
      tags,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = filters;

    const conditions: SQL[] = [];

    // Status filter
    if (status) {
      conditions.push(eq(products.status, status));
    }

    // Category filter
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    // Price filters
    if (minPrice) {
      conditions.push(gte(products.price, minPrice));
    }
    if (maxPrice) {
      conditions.push(lte(products.price, maxPrice));
    }

    // Stock filter
    if (inStock !== undefined) {
      conditions.push(inStock ? sql`${products.inventoryQuantity} > 0` : sql`${products.inventoryQuantity} = 0`);
    }

    // Tags filter
    if (tags && tags.length > 0) {
      const tagConditions = tags.map((tag) => sql`${products.tags} @> ${JSON.stringify([tag])}`);
      conditions.push(or(...tagConditions)!);
    }

    // Search filter
    if (search) {
      const searchConditions = [ilike(products.name, `%${search}%`), ilike(products.description, `%${search}%`)];
      conditions.push(or(...searchConditions)!);
    }

    // Count total records
    const [{ total }] = await db
      .select({ total: count() })
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Build sort order
    const sortColumn =
      {
        name: products.name,
        price: products.price,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        inventoryQuantity: products.inventoryQuantity,
      }[sortBy] || products.createdAt;

    const orderBy = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

    // Get products with pagination
    const productList = await db
      .select()
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit);

    // Get relations for each product
    const productsWithRelations = await Promise.all(productList.map((product) => getProductById(product.id, true)));

    const totalPages = Math.ceil(total / limit);

    logger.info("Products retrieved", {
      metadata: {
        count: productList.length,
        total,
        page,
        limit,
        filters,
      },
    });

    return {
      products: productsWithRelations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  });
};

// ============================================================================
// Product Search & Category Operations
// ============================================================================

/**
 * Get products by category with filtering
 * @param categoryId - Category ID to filter by
 * @param filters - Additional product filters
 * @returns Promise resolving to filtered products
 */
export const getProductsByCategory = async (categoryId: string, filters: Omit<ProductFilters, "categoryId"> = {}) => {
  return getProducts({ ...filters, categoryId });
};

/**
 * Search products by term
 * @param searchTerm - Search term for products
 * @param filters - Additional product filters
 * @returns Promise resolving to search results
 */
export const searchProducts = async (searchTerm: string, filters: Omit<ProductFilters, "search"> = {}) => {
  return getProducts({ ...filters, search: searchTerm });
};

/**
 * Get products with low stock levels
 * @param threshold - Stock threshold (default: 5)
 * @returns Promise resolving to low stock products
 */
export const getLowStockProducts = async (threshold?: number): Promise<ProductWithRelations[]> => {
  return dbErrorHandlers.read(async () => {
    const conditions = [sql`${products.inventoryQuantity} <= ${threshold ?? 5}`, eq(products.status, "active")];

    const lowStockProducts = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.inventoryQuantity));

    // Get relations for each product
    return await Promise.all(lowStockProducts.map((product) => getProductById(product.id, true)));
  });
};

// ============================================================================
// Product Management Operations
// ============================================================================

/**
 * Bulk update product status
 * @param productIds - Array of product IDs to update
 * @param status - New status for products
 */
export const bulkUpdateProductStatus = async (
  productIds: string[],
  status: "draft" | "active" | "inactive" | "discontinued"
): Promise<void> => {
  return dbErrorHandlers.update(async () => {
    await db
      .update(products)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(inArray(products.id, productIds));

    logger.info("Products status updated", {
      metadata: {
        productIds,
        newStatus: status,
        updatedCount: productIds.length,
      },
    });
  });
};
