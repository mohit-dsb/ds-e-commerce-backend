import { db } from "@/db";
import type { NewProduct } from "@/db/validators";
import { products, categories, productReviews, orders, orderItems, users } from "@/db/schema";
import { dbErrorHandlers } from "@/utils/database-errors";
import { generateSlug, generateUniqueSlug } from "@/utils/slug";
import { createNotFoundError, createConflictError, createValidationError } from "@/utils/errors";
import { eq, and, or, ilike, gte, lte, inArray, desc, asc, sql, count, type SQL } from "drizzle-orm";
import type {
  CreateReviewRequest,
  ProductFilters,
  ProductReview,
  ProductWithRelations,
  ReviewFilters,
  ReviewOperationResult,
  ReviewSummary,
  UpdateReviewRequest,
} from "@/types/product.types";

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
 * Delete a product (soft delete by setting isActive to false)
 * @param id - Product ID to delete
 */
export const deleteProduct = async (id: string): Promise<void> => {
  return dbErrorHandlers.delete(async () => {
    await getProductById(id, true);

    await db
      .update(products)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));
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
      conditions.push(eq(products.isActive, true));
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
        isActive: products.isActive,
        inventoryQuantity: products.inventoryQuantity,
        images: products.images,
        tags: products.tags,
        rating: products.rating,
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
      conditions.push(eq(products.isActive, true));
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
        isActive: products.isActive,
        inventoryQuantity: products.inventoryQuantity,
        images: products.images,
        tags: products.tags,
        rating: products.rating,
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
 * Update product rating based on reviews
 * @param productId - Product ID to update rating for
 */
export const updateProductRating = async (productId: string): Promise<void> => {
  return dbErrorHandlers.update(async () => {
    // Calculate average rating from all reviews for this product
    const [ratingResult] = await db
      .select({
        averageRating: sql<number>`COALESCE(AVG(${productReviews.rating}), 0)`,
      })
      .from(productReviews)
      .where(eq(productReviews.productId, productId));

    // Update the product's rating
    await db
      .update(products)
      .set({
        rating: ratingResult.averageRating.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
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
      isActive = true,
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
    if (isActive) {
      conditions.push(eq(products.isActive, isActive));
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
        rating: products.rating,
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
    const conditions = [sql`${products.inventoryQuantity} <= ${threshold ?? 5}`, eq(products.isActive, true)];

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
export const bulkUpdateProductStatus = async (productIds: string[], isActive: boolean): Promise<void> => {
  return dbErrorHandlers.update(async () => {
    await db
      .update(products)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(inArray(products.id, productIds));
  });
};

// ============================================================================
// Product Review Operations
// ============================================================================

/**
 * Create a new product review
 * @param userId - User creating the review
 * @param reviewData - Review data
 * @returns Promise resolving to created review
 */
export const createProductReview = async (userId: string, reviewData: CreateReviewRequest): Promise<ReviewOperationResult> => {
  return dbErrorHandlers.create(async () => {
    // Check if product exists and is active
    const product = await db
      .select({ id: products.id, isActive: products.isActive, name: products.name })
      .from(products)
      .where(eq(products.id, reviewData.productId))
      .limit(1);

    if (!product[0]) {
      throw createNotFoundError("Product");
    }

    if (!product[0].isActive) {
      throw createValidationError([
        {
          field: "productId",
          message: "Cannot review inactive products",
        },
      ]);
    }

    // Check if user already reviewed this product
    const existingReview = await db
      .select({ id: productReviews.id })
      .from(productReviews)
      .where(and(eq(productReviews.userId, userId), eq(productReviews.productId, reviewData.productId)))
      .limit(1);

    if (existingReview[0]) {
      throw createConflictError("You have already reviewed this product");
    }

    // Check if this is a verified purchase
    let isVerifiedPurchase = false;
    let { orderId } = reviewData;

    if (reviewData.orderId) {
      // Verify the order belongs to the user and contains this product
      const orderExists = await db
        .select({ id: orders.id })
        .from(orders)
        .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
        .where(
          and(
            eq(orders.id, reviewData.orderId),
            eq(orders.userId, userId),
            eq(orderItems.productId, reviewData.productId),
            eq(orders.status, "delivered")
          )
        )
        .limit(1);

      if (orderExists[0]) {
        isVerifiedPurchase = true;
      } else {
        orderId = undefined; // Remove invalid order ID
      }
    } else {
      // Check if user has any delivered order with this product
      const purchaseHistory = await db
        .select({ orderId: orders.id })
        .from(orders)
        .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
        .where(and(eq(orders.userId, userId), eq(orderItems.productId, reviewData.productId), eq(orders.status, "delivered")))
        .limit(1);

      if (purchaseHistory[0]) {
        isVerifiedPurchase = true;
        [{ orderId }] = purchaseHistory;
      }
    }

    // Create the review
    const [newReview] = await db
      .insert(productReviews)
      .values({
        userId,
        productId: reviewData.productId,
        orderId,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        isVerifiedPurchase,
        images: reviewData.images ?? [],
      })
      .returning();

    const review = await getProductReviewById(newReview.id);

    // Update product rating after creating review
    await updateProductRating(reviewData.productId);

    return {
      review,
      message: "Review submitted successfully",
    };
  });
};

/**
 * Update an existing review (only by the author)
 * @param reviewId - Review ID to update
 * @param userId - User updating the review
 * @param updateData - Updated review data
 * @returns Promise resolving to updated review
 */
export const updateProductReview = async (
  reviewId: string,
  userId: string,
  updateData: UpdateReviewRequest
): Promise<ReviewOperationResult> => {
  return dbErrorHandlers.update(async () => {
    // Get existing review
    const existingReview = await db
      .select({
        id: productReviews.id,
        userId: productReviews.userId,
      })
      .from(productReviews)
      .where(eq(productReviews.id, reviewId))
      .limit(1);

    if (!existingReview[0]) {
      throw createNotFoundError("Review");
    }

    // Check if user owns this review
    if (existingReview[0].userId !== userId) {
      throw createValidationError([
        {
          field: "userId",
          message: "You can only update your own reviews",
        },
      ]);
    }

    // Update the review
    await db
      .update(productReviews)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(productReviews.id, reviewId));

    const review = await getProductReviewById(reviewId);

    // Update product rating after updating review
    await updateProductRating(review.productId);

    return {
      review,
      message: "Review updated successfully",
    };
  });
};

/**
 * Delete a review (only by the author)
 * @param reviewId - Review ID to delete
 * @param userId - User deleting the review
 */
export const deleteProductReview = async (reviewId: string, userId: string): Promise<void> => {
  return dbErrorHandlers.delete(async () => {
    // Get existing review
    const existingReview = await db
      .select({
        id: productReviews.id,
        userId: productReviews.userId,
        productId: productReviews.productId,
      })
      .from(productReviews)
      .where(eq(productReviews.id, reviewId))
      .limit(1);

    if (!existingReview[0]) {
      throw createNotFoundError("Review");
    }

    // Check if user owns this review
    if (existingReview[0].userId !== userId) {
      throw createValidationError([
        {
          field: "userId",
          message: "You can only delete your own reviews",
        },
      ]);
    }

    const [existingReviewData] = existingReview;
    const { productId } = existingReviewData;

    // Delete the review
    await db.delete(productReviews).where(eq(productReviews.id, reviewId));

    // Update product rating after deleting review
    await updateProductRating(productId);
  });
};

/**
 * Get review by ID with optional relations
 * @param reviewId - Review ID to retrieve
 * @returns Promise resolving to review
 */
export const getProductReviewById = async (reviewId: string): Promise<ProductReview> => {
  const baseQuery = db
    .select({
      id: productReviews.id,
      userId: productReviews.userId,
      productId: productReviews.productId,
      orderId: productReviews.orderId,
      rating: productReviews.rating,
      title: productReviews.title,
      comment: productReviews.comment,
      isVerifiedPurchase: productReviews.isVerifiedPurchase,
      images: productReviews.images,
      metadata: productReviews.metadata,
      createdAt: productReviews.createdAt,
      updatedAt: productReviews.updatedAt,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(productReviews);

  baseQuery.leftJoin(users, eq(productReviews.userId, users.id));

  const [review] = await baseQuery.where(eq(productReviews.id, reviewId)).limit(1);

  if (!review) {
    throw createNotFoundError("Review");
  }

  return review as ProductReview;
};

/**
 * Get reviews for a product with filtering and pagination
 * @param productId - Product ID to get reviews for
 * @param filters - Review filtering options
 * @returns Promise resolving to paginated reviews
 */
export const getProductReviews = async (
  productId: string,
  filters: ReviewFilters = {}
): Promise<{
  reviews: ProductReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const { rating, sortBy = "createdAt", sortOrder = "desc", page = 1, limit = 20 } = filters;

  const conditions = [eq(productReviews.productId, productId)];

  // Rating filter
  if (rating) {
    conditions.push(eq(productReviews.rating, rating));
  }

  // Count total records
  const [{ total }] = await db
    .select({ total: count() })
    .from(productReviews)
    .where(and(...conditions));

  // Build sort order
  const sortColumn =
    {
      createdAt: productReviews.createdAt,
      rating: productReviews.rating,
    }[sortBy] || productReviews.createdAt;

  const orderBy = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  // Base query
  const baseQuery = db
    .select({
      id: productReviews.id,
      userId: productReviews.userId,
      productId: productReviews.productId,
      orderId: productReviews.orderId,
      rating: productReviews.rating,
      title: productReviews.title,
      comment: productReviews.comment,
      isVerifiedPurchase: productReviews.isVerifiedPurchase,
      images: productReviews.images,
      metadata: productReviews.metadata,
      createdAt: productReviews.createdAt,
      updatedAt: productReviews.updatedAt,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(productReviews);

  baseQuery.leftJoin(users, eq(productReviews.userId, users.id));

  const reviews = await baseQuery
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset((page - 1) * limit);

  const totalPages = Math.ceil(total / limit);

  return {
    reviews: reviews as ProductReview[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Get reviews summary for a product
 * @param productId - Product ID to get summary for
 * @returns Promise resolving to review summary
 */
export const getProductReviewSummary = async (productId: string): Promise<ReviewSummary> => {
  // Get basic statistics
  const [stats] = await db
    .select({
      totalReviews: count(),
      averageRating: sql<string>`avg(${productReviews.rating})`,
      verifiedPurchaseCount: count(sql`CASE WHEN ${productReviews.isVerifiedPurchase} = true THEN 1 END`),
    })
    .from(productReviews)
    .where(eq(productReviews.productId, productId));

  // Get rating distribution
  const ratingDistribution = await db
    .select({
      rating: productReviews.rating,
      count: count(),
    })
    .from(productReviews)
    .where(eq(productReviews.productId, productId))
    .groupBy(productReviews.rating);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingDistribution.forEach((item) => {
    distribution[item.rating as keyof typeof distribution] = item.count;
  });

  return {
    totalReviews: stats.totalReviews,
    averageRating: parseFloat(stats.averageRating ?? "0"),
    ratingDistribution: distribution,
    verifiedPurchaseCount: stats.verifiedPurchaseCount,
  };
};
