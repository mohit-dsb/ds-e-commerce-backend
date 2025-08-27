import { db } from "@/db";
import { logger } from "@/utils/logger";
import type { NewProduct } from "@/db/validators";
import type { ErrorContext } from "@/types/error.types";
import { dbErrorHandlers } from "@/utils/database-errors";
import { generateSlug, generateUniqueSlug } from "@/utils/slug";
import type { ProductFilters, ProductWithRelations } from "@/types/product.types";
import { createNotFoundError, createConflictError, createValidationError } from "@/utils/errors";
import { eq, and, or, ilike, gte, lte, inArray, desc, asc, sql, count, type SQL } from "drizzle-orm";
import { products, productCategories, categories } from "@/db/schema";

export class ProductService {
  /**
   * Create a new product
   */
  static async createProduct(
    productData: Omit<NewProduct, "id" | "createdAt" | "updatedAt">,
    additionalCategoryIds: string[] = [],
    context: ErrorContext = {}
  ): Promise<ProductWithRelations> {
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
          return await ProductService.getProductById(newProduct.id, context);
        });
      },
      "product",
      context
    );
  }

  /**
   * Get product by ID with relations
   */
  static async getProductById(id: string, context: ErrorContext = {}, includeInactive = false): Promise<ProductWithRelations> {
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
  }

  /**
   * Get product by slug with relations
   */
  static async getProductBySlug(
    slug: string,
    context: ErrorContext = {},
    includeInactive = false
  ): Promise<ProductWithRelations> {
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

        return await ProductService.getProductById(product.id, context, includeInactive);
      },
      "product",
      context
    );
  }

  /**
   * Get products with filtering, pagination, and sorting
   */
  static async getProducts(
    filters: ProductFilters = {},
    context: ErrorContext = {}
  ): Promise<{
    products: ProductWithRelations[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    return dbErrorHandlers.read(
      async () => {
        const {
          status,
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
        } else {
          // Default to active products for public API
          conditions.push(eq(products.status, "active"));
        }

        // Category filter (includes primary and additional categories)
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
          if (inStock) {
            conditions.push(or(and(or(sql`${products.inventoryQuantity} > 0`, eq(products.allowBackorder, true))))!);
          } else {
            conditions.push(and(sql`${products.inventoryQuantity} <= 0`, eq(products.allowBackorder, false))!);
          }
        }

        // Tags filter
        if (tags && tags.length > 0) {
          conditions.push(sql`${products.tags} @> ${JSON.stringify(tags)}`);
        }

        // Search filter
        if (search) {
          const searchTerm = `%${search}%`;
          conditions.push(
            or(
              ilike(products.name, searchTerm),
              ilike(products.description, searchTerm),
              ilike(products.shortDescription, searchTerm),
              ilike(products.sku, searchTerm)
            )!
          );
        }

        // Build the base query
        const baseQuery = db
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
          .where(and(...conditions));

        // Add sorting
        const sortColumn =
          sortBy === "name"
            ? products.name
            : sortBy === "price"
              ? products.price
              : sortBy === "inventoryQuantity"
                ? products.inventoryQuantity
                : sortBy === "updatedAt"
                  ? products.updatedAt
                  : products.createdAt;

        const orderedQuery = sortOrder === "asc" ? baseQuery.orderBy(asc(sortColumn)) : baseQuery.orderBy(desc(sortColumn));

        // Execute paginated query
        const offset = (page - 1) * limit;
        const paginatedProducts = await orderedQuery.limit(limit).offset(offset);

        // Get total count
        const [{ total }] = await db
          .select({ total: count() })
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(and(...conditions));

        // For each product, get additional categories
        const productsWithRelations = await Promise.all(
          paginatedProducts.map(async (product) => {
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
              .where(eq(productCategories.productId, product.id));

            return {
              ...product,
              additionalCategories,
            };
          })
        );

        const totalPages = Math.ceil(total / limit);

        return {
          products: productsWithRelations,
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        };
      },
      "product",
      context
    );
  }

  /**
   * Update a product
   */
  static async updateProduct(
    id: string,
    productData: Partial<Omit<NewProduct, "id" | "createdAt" | "updatedAt" | "slug">>,
    additionalCategoryIds?: string[],
    context: ErrorContext = {}
  ): Promise<ProductWithRelations> {
    return dbErrorHandlers.update(
      async () => {
        // Check if product exists
        const existingProduct = await ProductService.getProductById(id, context, true);

        // Prepare update data
        const updateData: Partial<Omit<NewProduct, "id" | "createdAt" | "updatedAt">> & { slug?: string } = { ...productData };

        // Validate updates
        if (productData.name && productData.name !== existingProduct.name) {
          const existingByName = await db
            .select()
            .from(products)
            .where(and(eq(products.name, productData.name), sql`${products.id} != ${id}`))
            .limit(1);
          if (existingByName.length > 0) {
            throw createConflictError("Product with this name already exists");
          }

          // Generate new slug when name changes
          const baseSlug = generateSlug(productData.name);

          const slugExists = async (slug: string): Promise<boolean> => {
            const existing = await db
              .select({ slug: products.slug })
              .from(products)
              .where(and(eq(products.slug, slug), sql`${products.id} != ${id}`))
              .limit(1);
            return existing.length > 0;
          };

          updateData.slug = await generateUniqueSlug(baseSlug, slugExists);
        }

        if (productData.sku && productData.sku !== existingProduct.sku) {
          const existingBySku = await db
            .select()
            .from(products)
            .where(and(eq(products.sku, productData.sku), sql`${products.id} != ${id}`))
            .limit(1);
          if (existingBySku.length > 0) {
            throw createConflictError("Product with this SKU already exists");
          }
        }

        // Update in a transaction
        return await db.transaction(async (tx) => {
          // Update the product
          if (Object.keys(updateData).length > 0) {
            await tx
              .update(products)
              .set({
                ...updateData,
                updatedAt: new Date(),
              })
              .where(eq(products.id, id));
          }

          // Update additional categories if provided
          if (additionalCategoryIds !== undefined) {
            // Remove existing additional category associations
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

          // Return updated product
          return await ProductService.getProductById(id, context, true);
        });
      },
      "product",
      context
    );
  }

  /**
   * Delete a product
   */
  static async deleteProduct(id: string, context: ErrorContext = {}): Promise<void> {
    return dbErrorHandlers.delete(
      async () => {
        const result = await db.delete(products).where(eq(products.id, id));

        if (result.rowCount === 0) {
          throw createNotFoundError("Product not found");
        }

        logger.info("Product deleted successfully");
      },
      "product",
      context
    );
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(
    categoryId: string,
    filters: Omit<ProductFilters, "categoryId"> = {},
    context: ErrorContext = {}
  ) {
    return ProductService.getProducts({ ...filters, categoryId }, context);
  }

  /**
   * Search products
   */
  static async searchProducts(searchTerm: string, filters: Omit<ProductFilters, "search"> = {}, context: ErrorContext = {}) {
    return ProductService.getProducts({ ...filters, search: searchTerm }, context);
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts(threshold?: number, context: ErrorContext = {}): Promise<ProductWithRelations[]> {
    return dbErrorHandlers.read(
      async () => {
        const conditions = [sql`${products.inventoryQuantity} <= ${threshold ?? 5}`, eq(products.status, "active")];

        const lowStockProducts = await db
          .select()
          .from(products)
          .where(and(...conditions))
          .orderBy(asc(products.inventoryQuantity));

        // Get relations for each product
        return await Promise.all(lowStockProducts.map((product) => ProductService.getProductById(product.id, context, true)));
      },
      "product",
      context
    );
  }

  /**
   * Bulk update product status
   */
  static async bulkUpdateProductStatus(
    productIds: string[],
    status: "draft" | "active" | "inactive" | "discontinued",
    context: ErrorContext = {}
  ): Promise<void> {
    return dbErrorHandlers.update(
      async () => {
        await db
          .update(products)
          .set({
            status,
            updatedAt: new Date(),
          })
          .where(inArray(products.id, productIds));

        logger.info("Products status updated");
      },
      "product",
      context
    );
  }
}
