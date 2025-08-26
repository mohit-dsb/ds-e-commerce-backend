import { db } from "../db";
import { logger } from "../utils/logger";
import { categories } from "../db/schema";
import type { ErrorContext } from "../types/error.types";
import { dbErrorHandlers } from "../utils/database-errors";
import type { Category, NewCategory } from "../db/validators";
import { eq, and, isNull, asc, or, not, type SQL } from "drizzle-orm";
import { createNotFoundError, createConflictError } from "../utils/errors";

export class CategoryService {
  /**
   * Create a new category
   */
  static async createCategory(
    categoryData: Omit<NewCategory, "id" | "createdAt" | "updatedAt">,
    context: ErrorContext = {}
  ): Promise<Category> {
    return dbErrorHandlers.create(
      async () => {
        // Check if category with same name or slug already exists
        const existingCategory = await db
          .select()
          .from(categories)
          .where(or(eq(categories.name, categoryData.name), eq(categories.slug, categoryData.slug)))
          .limit(1);

        if (existingCategory.length > 0) {
          throw createConflictError(
            existingCategory[0].name === categoryData.name
              ? "Category with this name already exists"
              : "Category with this slug already exists"
          );
        }

        // Validate parent category exists if parentId is provided
        if (categoryData.parentId) {
          const parentCategory = await db
            .select()
            .from(categories)
            .where(eq(categories.id, categoryData.parentId))
            .limit(1);

          if (parentCategory.length === 0) {
            throw createNotFoundError("Parent category");
          }
        }

        const newCategory = await db
          .insert(categories)
          .values({
            ...categoryData,
            updatedAt: new Date(),
          })
          .returning();

        logger.info("Category created successfully", {
          ...context,
          metadata: {
            categoryId: newCategory[0].id,
            categoryName: newCategory[0].name,
            slug: newCategory[0].slug,
          },
        });

        return newCategory[0];
      },
      "category",
      context
    );
  }

  /**
   * Get all categories with optional filtering
   */
  static async getCategories(
    filters: {
      isActive?: boolean;
      parentId?: string | null;
    } = {},
    context: ErrorContext = {}
  ): Promise<Category[]> {
    return dbErrorHandlers.read(
      async () => {
        const conditions: SQL[] = [];

        if (filters.isActive !== undefined) {
          conditions.push(eq(categories.isActive, filters.isActive));
        }

        if (filters.parentId === null) {
          conditions.push(isNull(categories.parentId));
        } else if (filters.parentId) {
          conditions.push(eq(categories.parentId, filters.parentId));
        }

        let categoryList;
        if (conditions.length > 0) {
          categoryList = await db
            .select()
            .from(categories)
            .where(and(...conditions))
            .orderBy(asc(categories.name));
        } else {
          categoryList = await db.select().from(categories).orderBy(asc(categories.name));
        }

        logger.info("Categories retrieved", {
          ...context,
          metadata: {
            count: categoryList.length,
            filters,
          },
        });

        return categoryList;
      },
      "category",
      context
    );
  }

  /**
   * Get category by ID
   */
  static async getCategoryById(categoryId: string, context: ErrorContext = {}): Promise<Category | null> {
    return dbErrorHandlers.read(
      async (): Promise<Category | null> => {
        const [category] = await db.select().from(categories).where(eq(categories.id, categoryId));

        if (category) {
          logger.info("Category retrieved by ID", {
            ...context,
            metadata: { categoryId, categoryName: category.name },
          });
          return category as Category;
        }

        return null;
      },
      "category",
      context
    );
  }

  /**
   * Get category by slug
   */
  static async getCategoryBySlug(slug: string, context: ErrorContext = {}): Promise<Category | null> {
    return dbErrorHandlers.read(
      async (): Promise<Category | null> => {
        const [category] = await db.select().from(categories).where(eq(categories.slug, slug));

        if (category) {
          logger.info("Category retrieved by slug", {
            ...context,
            metadata: { categoryId: category.id, slug },
          });
          return category as Category;
        }

        return null;
      },
      "category",
      context
    );
  }

  /**
   * Update category
   */
  static async updateCategory(
    categoryId: string,
    updateData: Partial<Omit<NewCategory, "id" | "createdBy" | "createdAt" | "updatedAt">>,
    context: ErrorContext = {}
  ): Promise<Category> {
    return dbErrorHandlers.update(
      async () => {
        // Check if category exists
        const existingCategory = await CategoryService.getCategoryById(categoryId, context);
        if (!existingCategory) {
          throw createNotFoundError("Category");
        }

        // Check for conflicts if name or slug is being updated
        if (updateData.name || updateData.slug) {
          const conflictConditions: SQL[] = [];

          if (updateData.name && updateData.name !== existingCategory.name) {
            conflictConditions.push(eq(categories.name, updateData.name));
          }

          if (updateData.slug && updateData.slug !== existingCategory.slug) {
            conflictConditions.push(eq(categories.slug, updateData.slug));
          }

          if (conflictConditions.length > 0) {
            const conflictingCategory = await db
              .select()
              .from(categories)
              .where(and(or(...conflictConditions), not(eq(categories.id, categoryId))))
              .limit(1);

            if (conflictingCategory.length > 0) {
              throw createConflictError(
                conflictingCategory[0].name === updateData.name
                  ? "Category with this name already exists"
                  : "Category with this slug already exists"
              );
            }
          }
        }

        // Validate parent category if being updated
        if (updateData.parentId && updateData.parentId !== existingCategory.parentId) {
          const parentCategory = await db
            .select()
            .from(categories)
            .where(eq(categories.id, updateData.parentId))
            .limit(1);

          if (parentCategory.length === 0) {
            throw createNotFoundError("Parent category");
          }
        }

        const [updatedCategory] = await db
          .update(categories)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(categories.id, categoryId))
          .returning();

        logger.info("Category updated successfully", {
          ...context,
          metadata: {
            categoryId: updatedCategory.id,
            categoryName: updatedCategory.name,
            changes: Object.keys(updateData),
          },
        });

        return updatedCategory as Category;
      },
      "category",
      context
    );
  }

  /**
   * Delete category (soft delete by setting isActive to false)
   */
  static async deleteCategory(categoryId: string, context: ErrorContext = {}): Promise<void> {
    return dbErrorHandlers.delete(
      async () => {
        const existingCategory = await CategoryService.getCategoryById(categoryId, context);
        if (!existingCategory) {
          throw createNotFoundError("Category");
        }

        // Check if category has children
        const childCategories = await db.select().from(categories).where(eq(categories.parentId, categoryId)).limit(1);

        if (childCategories.length > 0) {
          throw createConflictError("Cannot delete category with child categories");
        }

        await db
          .update(categories)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(categories.id, categoryId));

        logger.info("Category deleted (soft delete)", {
          ...context,
          metadata: {
            categoryId,
            categoryName: existingCategory.name,
          },
        });
      },
      "category",
      context
    );
  }

  /**
   * Get category hierarchy (parent with children)
   */
  static async getCategoryHierarchy(context: ErrorContext = {}): Promise<(Category & { children: Category[] })[]> {
    return dbErrorHandlers.read(
      async (): Promise<(Category & { children: Category[] })[]> => {
        // Get all active categories
        const allCategories = await db
          .select()
          .from(categories)
          .where(eq(categories.isActive, true))
          .orderBy(asc(categories.name));

        // Separate parents and children
        const typedCategories = allCategories as Category[];
        const parentCategories = typedCategories.filter((cat) => !cat.parentId);
        const childCategories = typedCategories.filter((cat) => cat.parentId);

        // Build hierarchy
        const hierarchy = parentCategories.map((parent) => ({
          ...parent,
          children: childCategories.filter((child) => child.parentId === parent.id),
        }));

        logger.info("Category hierarchy retrieved", {
          ...context,
          metadata: {
            totalCategories: allCategories.length,
            parentCategories: parentCategories.length,
            childCategories: childCategories.length,
          },
        });

        return hierarchy;
      },
      "category",
      context
    );
  }
}
