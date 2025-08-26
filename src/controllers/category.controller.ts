import type { Context } from "hono";
import { logger } from "../utils/logger";
import { createNotFoundError } from "../utils/errors";
import { createSuccessResponse } from "../utils/response";
import { CategoryService } from "../services/category.service";
import { createErrorContext } from "../middleware/request-context.middleware";

export class CategoryController {
  /**
   * Create a new category
   * POST /api/categories
   */
  static async createCategory(c: Context) {
    const validatedData = c.get("validatedData");
    const user = c.get("user");

    const context = createErrorContext(c);

    logger.info("Creating new category", {
      ...context,
      metadata: {
        categoryName: validatedData.name,
        slug: validatedData.slug,
        createdBy: user?.id,
      },
    });

    const category = await CategoryService.createCategory(
      {
        ...validatedData,
        createdBy: user.id,
      },
      context
    );

    return c.json(createSuccessResponse("Category created successfully", { category }), 201);
  }

  /**
   * Get all categories with optional filtering
   * GET /api/categories
   */
  static async getCategories(c: Context) {
    const isActive = c.req.query("isActive");
    const parentId = c.req.query("parentId");
    const hierarchy = c.req.query("hierarchy");

    const context = createErrorContext(c);

    // If hierarchy is requested, return hierarchical structure
    if (hierarchy === "true") {
      logger.info("Retrieving category hierarchy", context);

      const categoryHierarchy = await CategoryService.getCategoryHierarchy(context);

      return c.json(
        createSuccessResponse("Category hierarchy retrieved successfully", {
          categories: categoryHierarchy,
          total: categoryHierarchy.length,
          type: "hierarchy",
        })
      );
    }

    // Build filters object
    const filters: { isActive?: boolean; parentId?: string | null } = {};

    if (isActive !== undefined) {
      filters.isActive = isActive === "true";
    }

    if (parentId !== undefined) {
      filters.parentId = parentId === "null" ? null : parentId;
    }

    logger.info("Retrieving categories with filters", {
      ...context,
      metadata: { filters },
    });

    const categories = await CategoryService.getCategories(filters, context);

    return c.json(
      createSuccessResponse("Categories retrieved successfully", {
        categories,
        total: categories.length,
        filters,
      })
    );
  }

  /**
   * Get category by ID
   * GET /api/categories/:id
   */
  static async getCategoryById(c: Context) {
    const categoryId = c.req.param("id");

    const context = createErrorContext(c);

    logger.info("Retrieving category by ID", {
      ...context,
      metadata: { categoryId },
    });

    const category = await CategoryService.getCategoryById(categoryId, context);

    if (!category) {
      throw createNotFoundError("Category");
    }

    return c.json(createSuccessResponse("Category retrieved successfully", { category }));
  }

  /**
   * Get category by slug
   * GET /api/categories/slug/:slug
   */
  static async getCategoryBySlug(c: Context) {
    const slug = c.req.param("slug");

    const context = createErrorContext(c);

    logger.info("Retrieving category by slug", {
      ...context,
      metadata: { slug },
    });

    const category = await CategoryService.getCategoryBySlug(slug, context);

    if (!category) {
      throw createNotFoundError("Category");
    }

    return c.json(createSuccessResponse("Category retrieved successfully", { category }));
  }

  /**
   * Update category
   * PUT /api/categories/:id
   */
  static async updateCategory(c: Context) {
    const categoryId = c.req.param("id");
    const validatedData = c.get("validatedData");
    const user = c.get("user");

    const context = createErrorContext(c);

    logger.info("Updating category", {
      ...context,
      metadata: {
        categoryId,
        changes: Object.keys(validatedData),
        updatedBy: user?.id,
      },
    });

    const category = await CategoryService.updateCategory(categoryId, validatedData, context);

    return c.json(createSuccessResponse("Category updated successfully", { category }));
  }

  /**
   * Delete category (soft delete)
   * DELETE /api/categories/:id
   */
  static async deleteCategory(c: Context) {
    const categoryId = c.req.param("id");
    const user = c.get("user");

    const context = createErrorContext(c);

    logger.info("Deleting category", {
      ...context,
      metadata: {
        categoryId,
        deletedBy: user?.id,
      },
    });

    await CategoryService.deleteCategory(categoryId, context);

    return c.json(createSuccessResponse("Category deleted successfully", { categoryId }));
  }

  /**
   * Get child categories of a parent category
   * GET /api/categories/:id/children
   */
  static async getChildCategories(c: Context) {
    const parentId = c.req.param("id");

    const context = createErrorContext(c);

    logger.info("Retrieving child categories", {
      ...context,
      metadata: { parentId },
    });

    // First verify parent category exists
    const parentCategory = await CategoryService.getCategoryById(parentId, context);
    if (!parentCategory) {
      throw createNotFoundError("Parent category");
    }

    const childCategories = await CategoryService.getCategories({ parentId, isActive: true }, context);

    return c.json(
      createSuccessResponse("Child categories retrieved successfully", {
        parentCategory: {
          id: parentCategory.id,
          name: parentCategory.name,
          slug: parentCategory.slug,
        },
        childCategories,
        total: childCategories.length,
      })
    );
  }
}
