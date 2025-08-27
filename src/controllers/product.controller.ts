import type { Context } from "hono";
import type { NewProduct } from "@/db/validators";
import { createNotFoundError } from "@/utils/errors";
import { createSuccessResponse } from "@/utils/response";
import { ProductService } from "@/services/product.service";
import type { AuthContext } from "@/middleware/auth.middleware";
import { getValidatedData } from "@/middleware/validation.middleware";
import type { CreateProductRequest, ProductFilters, UpdateProductRequest } from "@/types/product.types";

export class ProductController {
  /**
   * Create a new product
   * POST /api/products
   */
  static async createProduct(c: Context) {
    const validatedData = getValidatedData<CreateProductRequest>(c, "json");
    const user = c.get("user") as AuthContext["user"];

    const { additionalCategoryIds = [], ...productData } = validatedData;

    const productDataForDb: Omit<NewProduct, "id" | "createdAt" | "updatedAt"> = {
      name: productData.name,
      description: productData.description ?? null,
      shortDescription: productData.shortDescription ?? null,
      slug: productData.slug ?? "",
      sku: productData.sku ?? null,
      price: productData.price,
      costPerItem: productData.costPerItem ?? null,
      weight: productData.weight ?? null,
      weightUnit: productData.weightUnit ?? "kg",
      status: productData.status ?? "draft",
      inventoryQuantity: productData.inventoryQuantity ?? 0,
      allowBackorder: productData.allowBackorder ?? false,
      images: productData.images ?? [],
      tags: productData.tags ?? [],
      categoryId: productData.categoryId ?? null,
      createdBy: user.id,
    };

    const product = await ProductService.createProduct(productDataForDb, additionalCategoryIds, { userId: user.id });

    return c.json(createSuccessResponse("Product created successfully", { product }), 201);
  }

  /**
   * Get all products with optional filtering
   * GET /api/products
   */
  static async getProducts(c: Context) {
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

    const result = await ProductService.getProducts(filters, {});

    return c.json(createSuccessResponse("Products retrieved successfully", result));
  }

  /**
   * Get product by slug
   * GET /api/products/slug/:slug
   */
  static async getProductBySlug(c: Context) {
    const slug = c.req.param("slug");
    const includeInactive = c.req.query("includeInactive") === "true";

    const product = await ProductService.getProductBySlug(slug, {}, includeInactive);

    return c.json(createSuccessResponse("Product retrieved successfully", { product }));
  }

  /**
   * Get product by ID
   * GET /api/products/:id
   */
  static async getProductById(c: Context) {
    const id = c.req.param("id");
    const includeInactive = c.req.query("includeInactive") === "true";

    const product = await ProductService.getProductById(id, {}, includeInactive);

    return c.json(createSuccessResponse("Product retrieved successfully", { product }));
  }

  /**
   * Update a product
   * PUT /api/products/:id
   */
  static async updateProduct(c: Context) {
    const id = c.req.param("id");
    const validatedData = getValidatedData<UpdateProductRequest>(c, "json");
    const user = c.get("user") as AuthContext["user"];

    const { additionalCategoryIds, ...productData } = validatedData;

    // Remove undefined values
    const cleanProductData = Object.fromEntries(
      Object.entries(productData).filter(([_, value]) => value !== undefined)
    ) as Partial<Omit<NewProduct, "id" | "createdAt" | "updatedAt">>;

    const product = await ProductService.updateProduct(id, cleanProductData, additionalCategoryIds, { userId: user.id });

    return c.json(createSuccessResponse("Product updated successfully", { product }));
  }

  /**
   * Delete a product
   * DELETE /api/products/:id
   */
  static async deleteProduct(c: Context) {
    const id = c.req.param("id");
    const user = c.get("user") as AuthContext["user"];

    await ProductService.deleteProduct(id, {
      userId: user.id,
    });

    return c.json(createSuccessResponse("Product deleted successfully", { productId: id }));
  }

  /**
   * Get products by category
   * GET /api/products/category/:categoryId
   */
  static async getProductsByCategory(c: Context) {
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

    const result = await ProductService.getProductsByCategory(categoryId, filters, {});

    return c.json(createSuccessResponse("Products retrieved successfully", result));
  }

  /**
   * Search products
   * GET /api/products/search
   */
  static async searchProducts(c: Context) {
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

    const result = await ProductService.searchProducts(searchTerm, filters, {});

    return c.json(createSuccessResponse("Products search completed successfully", result));
  }

  /**
   * Get low stock products
   * GET /api/products/low-stock
   */
  static async getLowStockProducts(c: Context) {
    const threshold = c.req.query("threshold");
    const user = c.get("user") as AuthContext["user"];

    const products = await ProductService.getLowStockProducts(threshold ? parseInt(threshold, 10) : undefined, {
      userId: user.id,
    });

    return c.json(createSuccessResponse("Low stock products retrieved successfully", { products }));
  }

  /**
   * Bulk update product status
   * PATCH /api/products/bulk-status
   */
  static async bulkUpdateProductStatus(c: Context) {
    const { productIds, status } = getValidatedData<{
      productIds: string[];
      status: "draft" | "active" | "inactive" | "discontinued";
    }>(c, "json");
    const user = c.get("user") as AuthContext["user"];

    await ProductService.bulkUpdateProductStatus(productIds, status, { userId: user.id });

    return c.json(createSuccessResponse("Product statuses updated successfully", { updatedCount: productIds.length }));
  }
}
