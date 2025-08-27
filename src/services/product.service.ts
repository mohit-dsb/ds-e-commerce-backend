import { db } from "@/db";
import { logger } from "@/utils/logger";
import type { NewProduct } from "@/db/validators";
import type { ErrorContext } from "@/types/error.types";
import { dbErrorHandlers } from "@/utils/database-errors";
import { generateSlug, generateUniqueSlug } from "@/utils/slug";
import type { ProductFilters, ProductWithRelations } from "@/types/product.types";
import { createNotFoundError, createConflictError, createValidationError } from "@/utils/errors";
import { products, productCategories, categories } from "@/db/schema";
import { eq, and, or, ilike, gte, lte, inArray, desc, asc, sql, count, type SQL } from "drizzle-orm";

// ============================================================================
// Product CRUD Operations
// ============================================================================

/**
 * Create a new product with automatic slug generation
 * @param productData - Product data without ID and timestamps
 * @param additionalCategoryIds - Additional category IDs to associate with the product
 * @param context - Error context for logging
 * @returns Promise resolving to created product with relations
 */
export const createProduct = async (
  productData: Omit<NewProduct, "id" | "createdAt" | "updatedAt">,
  additionalCategoryIds: string[] = [],
  context: ErrorContext = {}
): Promise<ProductWithRelations> => {
  return dbErrorHandlers.create(
    async () => {
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

      // Check if SKU already exists (if provided)
      if (productData.sku) {
        const existingBySku = await db.select().from(products).where(eq(products.sku, productData.sku)).limit(1);
        if (existingBySku.length > 0) {
          throw createConflictError("Product with this SKU already exists");
        }
      }

      // Validate category exists (if provided)
      if (productData.categoryId) {
        const categoryExists = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, productData.categoryId))
          .limit(1);
        if (categoryExists.length === 0) {
          throw createValidationError([{ field: "categoryId", message: "Primary category does not exist" }]);
        }
      }

      // Validate additional categories exist
      if (additionalCategoryIds.length > 0) {
        const existingCategories = await db
          .select({ id: categories.id })
          .from(categories)
          .where(inArray(categories.id, additionalCategoryIds));

        if (existingCategories.length !== additionalCategoryIds.length) {
          throw createValidationError([
            { field: "additionalCategoryIds", message: "One or more additional categories do not exist" },
          ]);
        }
      }

      // Create the product in a transaction
      return await db.transaction(async (tx) => {
        // Insert the product
        const [newProduct] = await tx
          .insert(products)
          .values({
            ...productData,
            slug: finalSlug,
          })
          .returning();

        // Create additional category associations
        if (additionalCategoryIds.length > 0) {
          const categoryAssociations = additionalCategoryIds.map((categoryId) => ({
            productId: newProduct.id,
            categoryId,
            isPrimary: false,
          }));

          await tx.insert(productCategories).values(categoryAssociations);
        }

        // Fetch and return the complete product with relations
        return await getProductById(newProduct.id, context);
      });
    },
    "product",
    context
  );
};

/**
 * Update an existing product with automatic slug regeneration
 * @param id - Product ID to update
 * @param updateData - Partial product data to update
 * @param additionalCategoryIds - Updated additional category IDs
 * @param context - Error context for logging
 * @returns Promise resolving to updated product with relations
 */
export const updateProduct = async (
  id: string,
  updateData: Partial<Omit<NewProduct, "id" | "createdAt" | "updatedAt">>,
  additionalCategoryIds?: string[],
  context: ErrorContext = {}
): Promise<ProductWithRelations> => {
  return dbErrorHandlers.update(
    async () => {
      // Check if product exists
      const existingProduct = await getProductById(id, context, true);

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

      // Check for conflicts if name or SKU is being updated
      if (finalUpdateData.name || finalUpdateData.sku) {
        const conflictConditions: SQL[] = [];

        if (finalUpdateData.name && finalUpdateData.name !== existingProduct.name) {
          conflictConditions.push(eq(products.name, finalUpdateData.name));
        }

        if (finalUpdateData.sku && finalUpdateData.sku !== existingProduct.sku) {
          conflictConditions.push(eq(products.sku, finalUpdateData.sku));
        }

        if (conflictConditions.length > 0) {
          const conflictingProduct = await db
            .select()
            .from(products)
            .where(and(or(...conflictConditions), sql`${products.id} != ${id}`))
            .limit(1);

          if (conflictingProduct.length > 0) {
            throw createConflictError(
              conflictingProduct[0].name === finalUpdateData.name
                ? "Product with this name already exists"
                : "Product with this SKU already exists"
            );
          }
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

      // Validate additional categories if provided
      if (additionalCategoryIds && additionalCategoryIds.length > 0) {
        const existingCategories = await db
          .select({ id: categories.id })
          .from(categories)
          .where(inArray(categories.id, additionalCategoryIds));

        if (existingCategories.length !== additionalCategoryIds.length) {
          throw createValidationError([
            { field: "additionalCategoryIds", message: "One or more additional categories do not exist" },
          ]);
        }
      }

      return await db.transaction(async (tx) => {
        // Update the product
        await tx
          .update(products)
          .set({
            ...finalUpdateData,
            updatedAt: new Date(),
          })
          .where(eq(products.id, id));

        // Update additional category associations if provided
        if (additionalCategoryIds !== undefined) {
          // Remove existing associations
          await tx.delete(productCategories).where(eq(productCategories.productId, id));

          // Add new associations
          if (additionalCategoryIds.length > 0) {
            const categoryAssociations = additionalCategoryIds.map((categoryId) => ({
              productId: id,
              categoryId,
              isPrimary: false,
            }));

            await tx.insert(productCategories).values(categoryAssociations);
          }
        }

        // Return the updated product with relations
        return await getProductById(id, context, true);
      });
    },
    "product",
    context
  );
};

/**
 * Delete a product (soft delete by setting status to discontinued)
 * @param id - Product ID to delete
 * @param context - Error context for logging
 */
export const deleteProduct = async (id: string, context: ErrorContext = {}): Promise<void> => {
  return dbErrorHandlers.delete(
    async () => {
      const existingProduct = await getProductById(id, context, true);

      await db
        .update(products)
        .set({
          status: "discontinued",
          updatedAt: new Date(),
        })
        .where(eq(products.id, id));

      logger.info("Product deleted successfully", {
        ...context,
        metadata: {
          productId: id,
          productName: existingProduct.name,
        },
      });
    },
    "product",
    context
  );
};

// ============================================================================
// Product Retrieval Operations
// ============================================================================

/**
 * Get product by ID with relations
 * @param id - Product ID to retrieve
 * @param context - Error context for logging
 * @param includeInactive - Whether to include inactive products
 * @returns Promise resolving to product with relations
 */
export const getProductById = async (
  id: string,
  context: ErrorContext = {},
  includeInactive = false
): Promise<ProductWithRelations> => {
  return dbErrorHandlers.read(
    async () => {
      const conditions = [eq(products.id, id)];
      if (!includeInactive) {
        conditions.push(eq(products.status, "active"));
      }

      const [product] = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          shortDescription: products.shortDescription,
          slug: products.slug,
          sku: products.sku,
          price: products.price,
          costPerItem: products.costPerItem,
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

      // Get additional categories
      const additionalCategories = await db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          isPrimary: productCategories.isPrimary,
        })
        .from(productCategories)
        .innerJoin(categories, eq(productCategories.categoryId, categories.id))
        .where(eq(productCategories.productId, id));

      return {
        ...product,
        additionalCategories,
      };
    },
    "product",
    context
  );
};

/**
 * Get product by slug with relations
 * @param slug - Product slug to retrieve
 * @param context - Error context for logging
 * @param includeInactive - Whether to include inactive products
 * @returns Promise resolving to product with relations
 */
export const getProductBySlug = async (
  slug: string,
  context: ErrorContext = {},
  includeInactive = false
): Promise<ProductWithRelations> => {
  return dbErrorHandlers.read(
    async () => {
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

      return await getProductById(product.id, context, includeInactive);
    },
    "product",
    context
  );
};

/**
 * Get products with filtering, sorting, and pagination
 * @param filters - Product filtering options
 * @param context - Error context for logging
 * @returns Promise resolving to paginated products with metadata
 */
export const getProducts = async (
  filters: ProductFilters = {},
  context: ErrorContext = {}
): Promise<{
  products: ProductWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  return dbErrorHandlers.read(
    async () => {
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
        conditions.push(
          or(
            eq(products.categoryId, categoryId),
            sql`EXISTS (
              SELECT 1 FROM ${productCategories} 
              WHERE ${productCategories.productId} = ${products.id} 
              AND ${productCategories.categoryId} = ${categoryId}
            )`
          )!
        );
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
        const searchConditions = [
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`),
          ilike(products.sku, `%${search}%`),
        ];
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
      const productsWithRelations = await Promise.all(productList.map((product) => getProductById(product.id, context, true)));

      const totalPages = Math.ceil(total / limit);

      logger.info("Products retrieved", {
        ...context,
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
    },
    "product",
    context
  );
};

// ============================================================================
// Product Search & Category Operations
// ============================================================================

/**
 * Get products by category with filtering
 * @param categoryId - Category ID to filter by
 * @param filters - Additional product filters
 * @param context - Error context for logging
 * @returns Promise resolving to filtered products
 */
export const getProductsByCategory = async (
  categoryId: string,
  filters: Omit<ProductFilters, "categoryId"> = {},
  context: ErrorContext = {}
) => {
  return getProducts({ ...filters, categoryId }, context);
};

/**
 * Search products by term
 * @param searchTerm - Search term for products
 * @param filters - Additional product filters
 * @param context - Error context for logging
 * @returns Promise resolving to search results
 */
export const searchProducts = async (
  searchTerm: string,
  filters: Omit<ProductFilters, "search"> = {},
  context: ErrorContext = {}
) => {
  return getProducts({ ...filters, search: searchTerm }, context);
};

/**
 * Get products with low stock levels
 * @param threshold - Stock threshold (default: 5)
 * @param context - Error context for logging
 * @returns Promise resolving to low stock products
 */
export const getLowStockProducts = async (threshold?: number, context: ErrorContext = {}): Promise<ProductWithRelations[]> => {
  return dbErrorHandlers.read(
    async () => {
      const conditions = [sql`${products.inventoryQuantity} <= ${threshold ?? 5}`, eq(products.status, "active")];

      const lowStockProducts = await db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(asc(products.inventoryQuantity));

      // Get relations for each product
      return await Promise.all(lowStockProducts.map((product) => getProductById(product.id, context, true)));
    },
    "product",
    context
  );
};

// ============================================================================
// Product Management Operations
// ============================================================================

/**
 * Bulk update product status
 * @param productIds - Array of product IDs to update
 * @param status - New status for products
 * @param context - Error context for logging
 */
export const bulkUpdateProductStatus = async (
  productIds: string[],
  status: "draft" | "active" | "inactive" | "discontinued",
  context: ErrorContext = {}
): Promise<void> => {
  return dbErrorHandlers.update(
    async () => {
      await db
        .update(products)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(inArray(products.id, productIds));

      logger.info("Products status updated", {
        ...context,
        metadata: {
          productIds,
          newStatus: status,
          updatedCount: productIds.length,
        },
      });
    },
    "product",
    context
  );
};
