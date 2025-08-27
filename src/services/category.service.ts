import { db } from "@/db";
import { logger } from "@/utils/logger";
import { categories } from "@/db/schema";
import type { ErrorContext } from "@/types/error.types";
import { dbErrorHandlers } from "@/utils/database-errors";
import type { Category, NewCategory } from "@/db/validators";
import { generateSlug, generateUniqueSlug } from "@/utils/slug";
import { eq, and, isNull, asc, or, not, type SQL } from "drizzle-orm";
import { createNotFoundError, createConflictError } from "@/utils/errors";

export class CategoryService {
  /**
   * Create a new category
   */
  static async createCategory(
    categoryData: Omit<NewCategory, "id" | "createdAt" | "updatedAt" | "slug">,
    context: ErrorContext = {}
  ): Promise<Category> {
    return dbErrorHandlers.create(
      async () => {
        // Always generate slug from category name for consistency and SEO
        const baseSlug = generateSlug(categoryData.name);

        // Create a function to check if slug exists
        const slugExists = async (slug: string): Promise<boolean> => {
          const existing = await db
            .select({ slug: categories.slug })
            .from(categories)
            .where(eq(categories.slug, slug))
            .limit(1);
          return existing.length > 0;
        };

        // Generate unique slug
        const finalSlug = await generateUniqueSlug(baseSlug, slugExists);

        // Check if category with same name already exists
        const existingByName = await db.select().from(categories).where(eq(categories.name, categoryData.name)).limit(1);

        if (existingByName.length > 0) {
          throw createConflictError("Category with this name already exists");
        }

        // Validate parent category exists if parentId is provided
        if (categoryData.parentId) {
          const parentCategory = await db.select().from(categories).where(eq(categories.id, categoryData.parentId)).limit(1);

          if (parentCategory.length === 0) {
            throw createNotFoundError("Parent category");
          }
        }

        const insertResult = await db
          .insert(categories)
          .values({
            ...categoryData,
            slug: finalSlug,
            updatedAt: new Date(),
          })
          .returning();

        const [createdCategory] = insertResult;

        logger.info("Category created successfully", {
          ...context,
          metadata: {
            categoryId: createdCategory.id,
            categoryName: createdCategory.name,
            slug: createdCategory.slug,
            slugGenerated: true,
          },
        });

        return createdCategory;
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

        return categoryList as Category[];
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
    updateData: Partial<Omit<NewCategory, "id" | "createdBy" | "createdAt" | "updatedAt" | "slug">>,
    context: ErrorContext = {}
  ): Promise<Category> {
    return dbErrorHandlers.update(
      async () => {
        // Check if category exists
        const existingCategory = await CategoryService.getCategoryById(categoryId, context);
        if (!existingCategory) {
          throw createNotFoundError("Category");
        }

        // Prepare the final update data
        const finalUpdateData: Partial<Category> = { ...updateData };

        // Always regenerate slug if name is updated for consistency and SEO
        if (updateData.name && updateData.name !== existingCategory.name) {
          const baseSlug = generateSlug(updateData.name);

          // Create a function to check if slug exists (excluding current category)
          const slugExists = async (slug: string): Promise<boolean> => {
            const existing = await db
              .select({ slug: categories.slug })
              .from(categories)
              .where(and(eq(categories.slug, slug), not(eq(categories.id, categoryId))))
              .limit(1);
            return existing.length > 0;
          };

          // Generate unique slug
          finalUpdateData.slug = await generateUniqueSlug(baseSlug, slugExists);
        }

        // Check for conflicts if name or slug is being updated
        if (finalUpdateData.name || finalUpdateData.slug) {
          const conflictConditions: SQL[] = [];

          if (finalUpdateData.name && finalUpdateData.name !== existingCategory.name) {
            conflictConditions.push(eq(categories.name, finalUpdateData.name));
          }

          if (finalUpdateData.slug && finalUpdateData.slug !== existingCategory.slug) {
            conflictConditions.push(eq(categories.slug, finalUpdateData.slug));
          }

          if (conflictConditions.length > 0) {
            const conflictingCategory = await db
              .select()
              .from(categories)
              .where(and(or(...conflictConditions), not(eq(categories.id, categoryId))))
              .limit(1);

            if (conflictingCategory.length > 0) {
              throw createConflictError(
                conflictingCategory[0].name === finalUpdateData.name
                  ? "Category with this name already exists"
                  : "Category with this slug already exists"
              );
            }
          }
        }

        // Validate parent category if being updated
        if (finalUpdateData.parentId && finalUpdateData.parentId !== existingCategory.parentId) {
          const parentCategory = await db.select().from(categories).where(eq(categories.id, finalUpdateData.parentId)).limit(1);

          if (parentCategory.length === 0) {
            throw createNotFoundError("Parent category");
          }
        }

        const [updatedCategory] = await db
          .update(categories)
          .set({
            ...finalUpdateData,
            updatedAt: new Date(),
          })
          .where(eq(categories.id, categoryId))
          .returning();

        logger.info("Category updated successfully", {
          ...context,
          metadata: {
            categoryId: updatedCategory.id,
            categoryName: updatedCategory.name,
            changes: Object.keys(finalUpdateData),
            slugRegenerated: updateData.name && updateData.name !== existingCategory.name,
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
