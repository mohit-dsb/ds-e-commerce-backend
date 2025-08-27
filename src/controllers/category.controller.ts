import type { Context } from "hono";
import type { NewCategory } from "@/db/validators";
import { createNotFoundError } from "@/utils/errors";
import { createSuccessResponse } from "@/utils/response";
import { sanitizeCategoryData } from "@/utils/sanitization";
import * as categoryService from "@/services/category.service";
import type { AuthContext } from "@/middleware/auth.middleware";
import { getValidatedData } from "@/middleware/validation.middleware";

// ============================================================================
// Type Definitions
// ============================================================================

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

// ============================================================================
// Category Management Controller Functions
// ============================================================================

/**
 * Create a new category
 * @desc Create a new category with automatic slug generation
 * @access Private (Admin only)
 */
export const createCategory = async (c: Context) => {
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

  const category = await categoryService.createCategory(categoryData);

  return c.json(createSuccessResponse("Category created successfully", { category }), 201);
};

/**
 * Update an existing category
 * @desc Update category with automatic slug regeneration if name changes
 * @access Private (Admin only)
 */
export const updateCategory = async (c: Context) => {
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

  const category = await categoryService.updateCategory(categoryId, updateData as Partial<UpdateCategoryRequest>);

  return c.json(createSuccessResponse("Category updated successfully", { category }));
};

/**
 * Delete category using soft delete
 * @desc Set category as inactive instead of hard delete
 * @access Private (Admin only)
 */
export const deleteCategory = async (c: Context) => {
  const categoryId = c.req.param("id");

  await categoryService.deleteCategory(categoryId);

  return c.json(createSuccessResponse("Category deleted successfully", { categoryId }));
};

// ============================================================================
// Category Retrieval Controller Functions
// ============================================================================

/**
 * Get all categories with optional filtering and hierarchy
 * @desc Retrieve categories with filtering options or hierarchical structure
 * @access Public
 */
export const getCategories = async (c: Context) => {
  const isActive = c.req.query("isActive") ?? "true";
  const parentId = c.req.query("parentId");
  const hierarchy = c.req.query("hierarchy");

  // If hierarchy is requested, return hierarchical structure
  if (hierarchy === "true") {
    const categoryHierarchy = await categoryService.getCategoryHierarchy();

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

  const categoryList = await categoryService.getCategories(filters);

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
};

/**
 * Get category by ID
 * @desc Retrieve a specific category by its ID
 * @access Public
 */
export const getCategoryById = async (c: Context) => {
  const categoryId = c.req.param("id");

  const category = await categoryService.getCategoryById(categoryId);

  if (!category) {
    throw createNotFoundError("Category");
  }

  return c.json(createSuccessResponse("Category retrieved successfully", { category }));
};

/**
 * Get category by slug
 * @desc Retrieve a specific category by its URL slug
 * @access Public
 */
export const getCategoryBySlug = async (c: Context) => {
  const slugParam = c.req.param("slug");

  // Sanitize slug parameter to prevent potential issues
  const slug = slugParam?.trim().toLowerCase();

  if (!slug) {
    throw createNotFoundError("Category");
  }

  const category = await categoryService.getCategoryBySlug(slug);

  if (!category) {
    throw createNotFoundError("Category");
  }

  return c.json(createSuccessResponse("Category retrieved successfully", { category }));
};

/**
 * Get child categories of a parent category
 * @desc Retrieve all child categories for a given parent
 * @access Public
 */
export const getChildCategories = async (c: Context) => {
  const parentId = c.req.param("id");

  // First verify parent category exists
  const parentCategory = await categoryService.getCategoryById(parentId);
  if (!parentCategory) {
    throw createNotFoundError("Parent category");
  }

  const childCategories = await categoryService.getCategories({ parentId, isActive: true });

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
};
