import { Hono } from "hono";
import { CategoryController } from "../controllers/category.controller";
import { compatibleZValidator } from "../middleware/validation.middleware";
import { insertCategorySchema, updateCategorySchema } from "../db/validators";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const categoryRoutes = new Hono();

/**
 * @route GET /api/categories
 * @desc Get all categories with optional filtering
 * @access Public
 * @query {string} [isActive] - Filter by active status (true/false)
 * @query {string} [parentId] - Filter by parent category ID (use "null" for root categories)
 * @query {string} [hierarchy] - Return hierarchical structure (true/false)
 */
categoryRoutes.get("/", CategoryController.getCategories);

/**
 * @route GET /api/categories/slug/:slug
 * @desc Get category by slug
 * @access Public
 */
categoryRoutes.get("/slug/:slug", CategoryController.getCategoryBySlug);

/**
 * @route GET /api/categories/:id
 * @desc Get category by ID
 * @access Public
 */
categoryRoutes.get("/:id", CategoryController.getCategoryById);

/**
 * @route GET /api/categories/:id/children
 * @desc Get child categories of a parent category
 * @access Public
 */
categoryRoutes.get("/:id/children", CategoryController.getChildCategories);

/**
 * @route POST /api/categories
 * @desc Create a new category (Admin only)
 * @access Private (Admin)
 * @body {object} category data
 */
categoryRoutes.post(
  "/",
  authMiddleware,
  adminMiddleware,
  compatibleZValidator("json", insertCategorySchema),
  CategoryController.createCategory
);

/**
 * @route PATCH /api/categories/:id
 * @desc Update category (Admin only)
 * @access Private (Admin)
 * @body {object} updated category data
 */
categoryRoutes.patch(
  "/:id",
  authMiddleware,
  adminMiddleware,
  compatibleZValidator("json", updateCategorySchema),
  CategoryController.updateCategory
);

/**
 * @route DELETE /api/categories/:id
 * @desc Delete category - soft delete (Admin only)
 * @access Private (Admin)
 */
categoryRoutes.delete("/:id", authMiddleware, adminMiddleware, CategoryController.deleteCategory);

export { categoryRoutes };
