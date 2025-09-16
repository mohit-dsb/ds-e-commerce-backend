import { Hono } from "hono";
import * as categoryController from "../controllers/category.controller";
import { compatibleZValidator } from "../middleware/validation.middleware";
import { insertCategorySchema, updateCategorySchema } from "../db/validators";
import { adminMiddleware } from "../middleware/auth.middleware";

const categoryRoutes = new Hono();

// ============================================================================
// Public Category Routes
// ============================================================================

/**
 * @route GET /api/categories
 * @desc Get all categories with optional filtering
 * @access Public
 * @query {string} [isActive] - Filter by active status (true/false)
 * @query {string} [parentId] - Filter by parent category ID (use "null" for root categories)
 * @query {string} [hierarchy] - Return hierarchical structure (true/false)
 */
categoryRoutes.get("/", categoryController.getCategories);

/**
 * @route GET /api/categories/slug/:slug
 * @desc Get category by slug
 * @access Public
 */
categoryRoutes.get("/slug/:slug", categoryController.getCategoryBySlug);

/**
 * @route GET /api/categories/:id
 * @desc Get category by ID
 * @access Public
 */
categoryRoutes.get("/:id", categoryController.getCategoryById);

/**
 * @route GET /api/categories/:id/children
 * @desc Get child categories of a parent category
 * @access Public
 */
categoryRoutes.get("/:id/children", categoryController.getChildCategories);

// ============================================================================
// Admin-Only Category Routes
// ============================================================================

/**
 * @route POST /api/categories
 * @desc Create a new category (Admin only)
 * @access Private (Admin)
 * @body {object} category data
 */
categoryRoutes.post("/", adminMiddleware, compatibleZValidator("json", insertCategorySchema), categoryController.createCategory);

/**
 * @route PATCH /api/categories/:id
 * @desc Update category (Admin only)
 * @access Private (Admin)
 * @body {object} updated category data
 */
categoryRoutes.patch(
  "/:id",
  adminMiddleware,
  compatibleZValidator("json", updateCategorySchema),
  categoryController.updateCategory
);

/**
 * @route DELETE /api/categories/:id
 * @desc Delete category - soft delete (Admin only)
 * @access Private (Admin)
 */
categoryRoutes.delete("/:id", adminMiddleware, categoryController.deleteCategory);

export default categoryRoutes;
