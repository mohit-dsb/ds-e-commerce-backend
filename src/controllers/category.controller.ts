import type { Context } from "hono";
import type { NewCategory } from "@/db/schema";
import { createNotFoundError } from "@/utils/errors";
import { createSuccessResponse } from "@/utils/response";
import { sanitizeCategoryData } from "@/utils/sanitization";
import { CategoryService } from "@/services/category.service";
import type { AuthContext } from "@/middleware/auth.middleware";
import { getValidatedData } from "@/middleware/validation.middleware";

// Types for validation
interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
}

interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
}

interface CategoryFilters {
  isActive?: boolean;
  parentId?: string | null;
}

export class CategoryController {
  /**
   * Create a new category
   * POST /api/categories
   */
  static async createCategory(c: Context) {
    const validatedData = getValidatedData<CreateCategoryRequest>(c, "json");
    const user = c.get("user") as AuthContext["user"];

    // Additional sanitization for extra safety
    const sanitizedData = sanitizeCategoryData(validatedData);

    // Merge validated and sanitized data, prioritizing sanitized values
    const categoryData: Omit<NewCategory, "id" | "createdAt" | "updatedAt"> = {
      name: sanitizedData.name ?? validatedData.name,
      slug: sanitizedData.slug ?? validatedData.slug ?? "",
      description: sanitizedData.description !== undefined ? sanitizedData.description : validatedData.description,
      isActive: validatedData.isActive,
      parentId: validatedData.parentId,
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
    const isActive = c.req.query("isActive") ?? "true";
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
    const filters: CategoryFilters = {};

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
    const validatedData = getValidatedData<UpdateCategoryRequest>(c, "json");

    // Additional sanitization for extra safety
    const sanitizedData = sanitizeCategoryData(validatedData);

    // Merge validated and sanitized data, prioritizing sanitized values
    const updateData: Record<string, unknown> = {
      ...validatedData,
      ...(sanitizedData.name !== undefined && { name: sanitizedData.name }),
      ...(sanitizedData.slug !== undefined && { slug: sanitizedData.slug }),
      ...(sanitizedData.description !== undefined && { description: sanitizedData.description }),
    };

    // Remove any undefined/null/empty values to avoid updating with empty values
    Object.keys(updateData).forEach((key) => {
      const value = updateData[key];
      if (value === null || value === undefined || value === "") {
        delete updateData[key];
      }
    });

    const category = await CategoryService.updateCategory(categoryId, updateData as Partial<UpdateCategoryRequest>);

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
