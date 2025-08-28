import { Hono } from "hono";
import { z } from "zod";
import * as productController from "@/controllers/product.controller";
import { compatibleZValidator } from "@/middleware/validation.middleware";
import { insertProductSchema, updateProductSchema } from "@/db/validators";
import { authMiddleware, adminMiddleware } from "@/middleware/auth.middleware";
import productImageRoutes from "./product-image.routes";

const productRoutes = new Hono();

/**
 * @route GET /api/products
 * @desc Get all products with optional filtering and pagination
 * @access Public
 * @query {string} [status] - Filter by product status (draft/active/inactive/discontinued)
 * @query {string} [categoryId] - Filter by category ID
 * @query {string} [minPrice] - Minimum price filter
 * @query {string} [maxPrice] - Maximum price filter
 * @query {boolean} [inStock] - Filter by stock availability
 * @query {string} [tags] - Comma-separated list of tags
 * @query {string} [search] - Search term for name, description
 * @query {string} [sortBy] - Sort by field (name/price/createdAt/updatedAt/inventoryQuantity)
 * @query {string} [sortOrder] - Sort order (asc/desc)
 * @query {number} [page] - Page number for pagination
 * @query {number} [limit] - Number of items per page
 */
productRoutes.get("/", productController.getProducts);

/**
 * @route GET /api/products/search
 * @desc Search products by term
 * @access Public
 * @query {string} q or search - Search term (required)
 * @query {string} [status] - Filter by product status
 * @query {string} [categoryId] - Filter by category ID
 * @query {string} [minPrice] - Minimum price filter
 * @query {string} [maxPrice] - Maximum price filter
 * @query {boolean} [inStock] - Filter by stock availability
 * @query {string} [tags] - Comma-separated list of tags
 * @query {string} [sortBy] - Sort by field
 * @query {string} [sortOrder] - Sort order
 * @query {number} [page] - Page number
 * @query {number} [limit] - Items per page
 */
productRoutes.get("/search", productController.searchProducts);

/**
 * @route GET /api/products/low-stock
 * @desc Get products with low stock levels
 * @access Private (Admin)
 * @query {number} [threshold] - Stock threshold (default: 5)
 */
productRoutes.get("/low-stock", authMiddleware, adminMiddleware, productController.getLowStockProducts);

/**
 * @route GET /api/products/category/:categoryId
 * @desc Get products by category
 * @access Public
 * @param {string} categoryId - Category UUID
 * @query - Same as GET /api/products
 */
productRoutes.get("/category/:categoryId", productController.getProductsByCategory);

/**
 * @route GET /api/products/slug/:slug
 * @desc Get product by slug
 * @access Public
 * @param {string} slug - Product slug
 * @query {boolean} [includeInactive] - Include inactive products (admin only)
 */
productRoutes.get("/slug/:slug", productController.getProductBySlug);

/**
 * @route GET /api/products/:id
 * @desc Get product by ID
 * @access Public
 * @param {string} id - Product UUID
 * @query {boolean} [includeInactive] - Include inactive products (admin only)
 */
productRoutes.get("/:id", productController.getProductById);

/**
 * @route POST /api/products
 * @desc Create a new product
 * @access Private (Admin)
 * @body {CreateProductRequest} Product data
 */
productRoutes.post(
  "/",
  authMiddleware,
  adminMiddleware,
  compatibleZValidator("json", insertProductSchema),
  productController.createProduct
);

/**
 * @route PATCH /api/products/:id
 * @desc Update a product
 * @access Private (Admin)
 * @param {string} id - Product UUID
 * @body {UpdateProductRequest} Updated product data
 */
productRoutes.patch(
  "/:id",
  authMiddleware,
  adminMiddleware,
  compatibleZValidator("json", updateProductSchema),
  productController.updateProduct
);

/**
 * @route DELETE /api/products/:id
 * @desc Delete a product
 * @access Private (Admin)
 * @param {string} id - Product UUID
 */
productRoutes.delete("/:id", authMiddleware, adminMiddleware, productController.deleteProduct);

/**
 * @route PATCH /api/products/bulk-status
 * @desc Bulk update product status
 * @access Private (Admin)
 * @body {object} { productIds: string[], status: string }
 */
productRoutes.patch(
  "/bulk-status",
  authMiddleware,
  adminMiddleware,
  compatibleZValidator(
    "json",
    z.object({
      productIds: z.array(z.string().uuid()).min(1, "At least one product ID is required"),
      status: z.enum(["draft", "active", "inactive", "discontinued"]),
    })
  ),
  productController.bulkUpdateProductStatus
);

// Mount image upload routes
productRoutes.route("/", productImageRoutes);

export default productRoutes;
