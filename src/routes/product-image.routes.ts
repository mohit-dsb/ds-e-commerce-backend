import { Hono } from "hono";
import * as productImageController from "@/controllers/product-image.controller";
import { compatibleZValidator } from "@/middleware/validation.middleware";
import { updateProductImagesSchema } from "@/db/validators";
import { adminMiddleware } from "@/middleware/auth.middleware";

const productImageRoutes = new Hono();

/**
 * @route POST /api/products/upload-image
 * @desc Upload a single product image
 * @access Private (Admin)
 * @body FormData with 'image' file and optional 'transformation' JSON string
 */
productImageRoutes.post("/upload-image", adminMiddleware, productImageController.uploadProductImage);

/**
 * @route POST /api/products/upload-images
 * @desc Upload multiple product images (batch upload)
 * @access Private (Admin)
 * @body FormData with 'images[]' files and optional configuration
 */
productImageRoutes.post("/upload-images", adminMiddleware, productImageController.uploadProductImages);

/**
 * @route PATCH /api/products/:id/images
 * @desc Update product images (add, remove, or replace)
 * @access Private (Admin)
 * @param {string} id - Product ID
 * @body {UpdateProductImagesRequest} - Image update data
 */
productImageRoutes.patch(
  "/:id/images",
  adminMiddleware,
  compatibleZValidator("json", updateProductImagesSchema),
  productImageController.updateProductImages
);

/**
 * @route DELETE /api/products/:id/images/:publicId
 * @desc Delete a specific product image
 * @access Private (Admin)
 * @param {string} id - Product ID
 * @param {string} publicId - Cloudinary public ID of the image to delete
 */
productImageRoutes.delete("/:id/images/:publicId", adminMiddleware, productImageController.deleteProductImage);

export default productImageRoutes;
