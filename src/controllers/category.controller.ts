import type { Context } from "hono";
import { createNotFoundError } from "@/utils/errors";
import { createSuccessResponse } from "@/utils/response";
import { CategoryService } from "@/services/category.service";
import { sanitizeCategoryData } from "@/utils/sanitization";
import { getValidatedData } from "@/middleware/validation.middleware";

export class CategoryController {
  /**
   * Create a new category
   * POST /api/categories
   */
  static async createCategory(c: Context) {
    const validatedData = getValidatedData<any>(c, "json");
    const user = c.get("user");

    // Additional sanitization for extra safety
    const sanitizedData = sanitizeCategoryData(validatedData);

    // Merge validated and sanitized data, prioritizing sanitized values
    const categoryData = {
      ...validatedData,
      name: sanitizedData.name ?? validatedData.name,
      slug: sanitizedData.slug ?? validatedData.slug,
      description: sanitizedData.description !== undefined ? sanitizedData.description : validatedData.description,
      createdBy: user.id,
    };

    // Validate that required fields are not empty after sanitization
    if (!categoryData.name) {
      throw new Error("Category name cannot be empty after sanitization");
    }

    const category = await CategoryService.createCategory(categoryData);

    return c.json(createSuccessResponse("Category created successfully", { category }), 201);
  }

  /**
   * Get all categories with optional filtering
   * GET /api/categories
   */
  static async getCategories(c: Context) {
    const isActive = c.req.query("isActive") || "true";
    const parentId = c.req.query("parentId");
    const hierarchy = c.req.query("hierarchy");

    // If hierarchy is requested, return hierarchical structure
    if (hierarchy === "true") {
      const categoryHierarchy = await CategoryService.getCategoryHierarchy();

      return c.json(
        createSuccessResponse("Category hierarchy retrieved successfully", {
          categories: categoryHierarchy,
          total: categoryHierarchy.length,
        })
      );
    }

    // Regular category listing with filters
    const filters: any = {};

    if (isActive !== undefined) {
      filters.isActive = isActive === "true";
    }

    if (parentId !== undefined) {
      filters.parentId = parentId === "null" ? null : parentId;
    }

    const categoryList = await CategoryService.getCategories(filters);

    return c.json(
      createSuccessResponse("Categories retrieved successfully", {
        categories: categoryList,
        total: categoryList.length,
        filters: {
          isActive: filters.isActive,
          parentId: filters.parentId,
        },
      })
    );
  }

  /**
   * Get category by ID
   * GET /api/categories/:id
   */
  static async getCategoryById(c: Context) {
    const categoryId = c.req.param("id");

    const category = await CategoryService.getCategoryById(categoryId);

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
    const slugParam = c.req.param("slug");

    // Sanitize slug parameter to prevent potential issues
    const slug = slugParam?.trim().toLowerCase();

    if (!slug) {
      throw createNotFoundError("Category");
    }

    const category = await CategoryService.getCategoryBySlug(slug);

    if (!category) {
      throw createNotFoundError("Category");
    }

    return c.json(createSuccessResponse("Category retrieved successfully", { category }));
  }

  /**
   * Update category
   * PATCH /api/categories/:id
   */
  static async updateCategory(c: Context) {
    const categoryId = c.req.param("id");
    const validatedData = getValidatedData<any>(c, "json");

    // Additional sanitization for extra safety
    const sanitizedData = sanitizeCategoryData(validatedData);

    // Merge validated and sanitized data, prioritizing sanitized values
    const updateData = {
      ...validatedData,
      ...(sanitizedData.name !== undefined && { name: sanitizedData.name }),
      ...(sanitizedData.slug !== undefined && { slug: sanitizedData.slug }),
      ...(sanitizedData.description !== undefined && { description: sanitizedData.description }),
    };

    // Remove any undefined/null values to avoid updating with empty values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === null || updateData[key] === undefined || updateData[key] === "") {
        delete updateData[key];
      }
    });

    const category = await CategoryService.updateCategory(categoryId, updateData);

    return c.json(createSuccessResponse("Category updated successfully", { category }));
  }

  /**
   * Delete category (soft delete)
   * DELETE /api/categories/:id
   */
  static async deleteCategory(c: Context) {
    const categoryId = c.req.param("id");

    await CategoryService.deleteCategory(categoryId);

    return c.json(createSuccessResponse("Category deleted successfully", { categoryId }));
  }

  /**
   * Get child categories of a parent category
   * GET /api/categories/:id/children
   */
  static async getChildCategories(c: Context) {
    const parentId = c.req.param("id");

    // First verify parent category exists
    const parentCategory = await CategoryService.getCategoryById(parentId);
    if (!parentCategory) {
      throw createNotFoundError("Parent category");
    }

    const childCategories = await CategoryService.getCategories({ parentId, isActive: true });

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
