import type { Context } from "hono";
import { logger } from "@/utils/logger";
import { createSuccessResponse } from "@/utils/response";
import { getValidatedData } from "@/middleware/validation.middleware";
import * as cloudinaryService from "@/services/cloudinary.service";
import * as productService from "@/services/product.service";
import type { UpdateProductImagesRequest } from "@/types/product.types";
import { createValidationError, createNotFoundError } from "@/utils/errors";

// ============================================================================
// File Upload Utilities
// ============================================================================

// Helper function to extract Cloudinary public ID from URL
const extractPublicIdFromUrl = (url: string): string => {
  try {
    const parts = url.split("/");
    const filename = parts[parts.length - 1];
    const [publicId] = filename.split(".");
    return publicId || "";
  } catch {
    return "";
  }
};

/**
 * Validate image file from form data
 */
const validateImageFile = (file: File): void => {
  // Check file size (5MB limit)
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_FILE_SIZE) {
    throw createValidationError([
      {
        field: "image",
        message: "File size must be less than 5MB",
      },
    ]);
  }

  // Check file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw createValidationError([
      {
        field: "image",
        message: "Only JPEG, PNG, and WebP images are allowed",
      },
    ]);
  }
};

/**
 * Convert File to Buffer
 */
const fileToBuffer = async (file: File): Promise<Buffer> => {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

// ============================================================================
// Image Upload Controllers
// ============================================================================

/**
 * Upload a single product image
 * POST /api/products/upload-image
 */
export const uploadProductImage = async (c: Context) => {
  try {
    if (!cloudinaryService.isConfigured()) {
      throw createValidationError([
        {
          field: "service",
          message: "Image upload service is not available",
        },
      ]);
    }

    const formData = await c.req.formData();
    const imageFile = formData.get("image") as File;
    const transformationData = formData.get("transformation");

    if (!imageFile) {
      throw createValidationError([
        {
          field: "image",
          message: "Image file is required",
        },
      ]);
    }

    // Validate the image file
    validateImageFile(imageFile);

    // Parse transformation options if provided
    let transformation: cloudinaryService.ImageUploadOptions["transformation"];
    if (transformationData && typeof transformationData === "string") {
      try {
        transformation = JSON.parse(transformationData) as cloudinaryService.ImageUploadOptions["transformation"];
      } catch {
        throw createValidationError([
          {
            field: "transformation",
            message: "Invalid transformation options",
          },
        ]);
      }
    }

    // Convert file to buffer
    const imageBuffer = await fileToBuffer(imageFile);

    // Upload to Cloudinary
    const uploadOptions: cloudinaryService.ImageUploadOptions = {
      folder: "products",
      ...(transformation && { transformation }),
    };

    const result = await cloudinaryService.uploadImage(imageBuffer, uploadOptions);

    logger.info("Product image uploaded successfully");

    return c.json(
      createSuccessResponse("Image uploaded successfully", {
        image: {
          publicId: result.publicId,
          url: result.url,
          secureUrl: result.secureUrl,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        },
      }),
      201
    );
  } catch (error) {
    logger.error("Failed to upload product image");
    throw error;
  }
};

/**
 * Upload multiple product images
 * POST /api/products/upload-images
 */
export const uploadProductImages = async (c: Context) => {
  try {
    if (!cloudinaryService.isConfigured()) {
      throw createValidationError([
        {
          field: "service",
          message: "Image upload service is not available",
        },
      ]);
    }

    const formData = await c.req.formData();
    const files = formData.getAll("images") as File[];
    const transformationData = formData.get("transformation");
    const maxFilesValue = formData.get("maxFiles");
    const maxFiles = maxFilesValue && typeof maxFilesValue === "string" ? parseInt(maxFilesValue, 10) : 5;

    if (!files || files.length === 0) {
      throw createValidationError([
        {
          field: "images",
          message: "At least one image file is required",
        },
      ]);
    }

    if (files.length > maxFiles) {
      throw createValidationError([
        {
          field: "images",
          message: `Maximum ${maxFiles} images allowed`,
        },
      ]);
    }

    // Validate all files first
    files.forEach((file, index) => {
      try {
        validateImageFile(file);
      } catch (error) {
        throw createValidationError([
          {
            field: `images[${index}]`,
            message: `File ${file.name}: ${error instanceof Error ? error.message : "Invalid file"}`,
          },
        ]);
      }
    });

    // Parse transformation options if provided
    let transformation: cloudinaryService.ImageUploadOptions["transformation"];
    if (transformationData && typeof transformationData === "string") {
      try {
        transformation = JSON.parse(transformationData) as cloudinaryService.ImageUploadOptions["transformation"];
      } catch {
        throw createValidationError([
          {
            field: "transformation",
            message: "Invalid transformation options",
          },
        ]);
      }
    }

    // Convert files to buffers
    const imageBuffers = await Promise.all(
      files.map(async (file) => ({
        buffer: await fileToBuffer(file),
        originalName: file.name,
      }))
    );

    // Upload to Cloudinary
    const uploadOptions: cloudinaryService.ImageUploadOptions = {
      folder: "products",
      ...(transformation && { transformation }),
    };

    const results = await cloudinaryService.uploadMultipleImages(imageBuffers, uploadOptions);

    logger.info("Multiple product images uploaded");

    return c.json(
      createSuccessResponse("Images uploaded successfully", {
        successful: results.success.map((result: cloudinaryService.CloudinaryUploadResult) => ({
          publicId: result.publicId,
          url: result.url,
          secureUrl: result.secureUrl,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        })),
        failed: results.errors,
        summary: {
          totalUploaded: results.success.length,
          totalFailed: results.errors.length,
          totalAttempted: files.length,
        },
      }),
      201
    );
  } catch (error) {
    logger.error("Failed to upload product images");
    throw error;
  }
};

/**
 * Update product images (add, remove, or replace)
 * PATCH /api/products/:id/images
 */
export const updateProductImages = async (c: Context) => {
  try {
    const productId = c.req.param("id");

    // Data is validated by Zod middleware, safe to use
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const validatedData = getValidatedData<UpdateProductImagesRequest>(c, "json");

    // Check if product exists
    const existingProduct = await productService.getProductById(productId);
    if (!existingProduct) {
      throw createNotFoundError("Product");
    }

    // Data is validated by middleware, safe to destructure
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { action, images = [], imagesToRemove = [] } = validatedData;
    let updatedImages = [...(existingProduct.images ?? [])];

    // Handle different actions
    switch (action) {
      case "add":
        // Add new images to existing ones
        if (Array.isArray(images) && images.every((img): img is string => typeof img === "string")) {
          updatedImages = [...updatedImages, ...images];
        }
        break;

      case "remove":
        // Remove specific images by public ID
        if (Array.isArray(imagesToRemove) && imagesToRemove.length > 0) {
          // Extract public IDs from current image URLs to match against removal list
          updatedImages = updatedImages.filter((imageUrl) => {
            const publicId = extractPublicIdFromUrl(imageUrl);
            return !imagesToRemove.includes(publicId);
          });

          // Delete images from Cloudinary
          const publicIdsToRemove = imagesToRemove.filter((id): id is string => typeof id === "string");
          if (publicIdsToRemove.length > 0) {
            await cloudinaryService.deleteMultipleImages(publicIdsToRemove);
          }
        }
        break;

      case "replace":
        // Replace all images with new ones
        if (existingProduct.images && existingProduct.images.length > 0) {
          // Extract public IDs from existing images and delete them
          const existingPublicIds = existingProduct.images.map(extractPublicIdFromUrl).filter(Boolean);

          if (existingPublicIds.length > 0) {
            await cloudinaryService.deleteMultipleImages(existingPublicIds);
          }
        }
        if (Array.isArray(images) && images.every((img): img is string => typeof img === "string")) {
          updatedImages = images;
        }
        break;

      default:
        throw createValidationError([
          {
            field: "action",
            message: "Invalid action. Must be 'add', 'remove', or 'replace'",
          },
        ]);
    }

    // Validate total image count
    if (updatedImages.length > 10) {
      throw createValidationError([
        {
          field: "images",
          message: "Maximum 10 images allowed per product",
        },
      ]);
    }

    // Update the product with new images
    const updatedProduct = await productService.updateProduct(productId, {
      images: updatedImages,
    });

    logger.info("Product images updated successfully");

    return c.json(
      createSuccessResponse("Product images updated successfully", {
        product: updatedProduct,
        imagesCount: updatedImages.length,
      })
    );
  } catch (error) {
    logger.error("Failed to update product images");
    throw error;
  }
};

/**
 * Delete a specific product image
 * DELETE /api/products/:id/images/:publicId
 */
export const deleteProductImage = async (c: Context) => {
  try {
    const productId = c.req.param("id");
    const imageId = c.req.param("imageId");

    // Check if product exists
    const existingProduct = await productService.getProductById(productId);
    if (!existingProduct) {
      throw createNotFoundError("Product");
    }

    // Check if image exists in product
    const updatedImages = (existingProduct.images ?? []).filter((imageUrl) => {
      const publicId = extractPublicIdFromUrl(imageUrl);
      return publicId !== imageId;
    });

    if (updatedImages.length === (existingProduct.images ?? []).length) {
      throw createNotFoundError("Image");
    }

    // Delete from Cloudinary
    await cloudinaryService.deleteMultipleImages([imageId]);

    // Update product in database
    const updatedProduct = await productService.updateProduct(productId, {
      images: updatedImages,
    });

    const response = createSuccessResponse("Image deleted successfully", {
      product: updatedProduct,
    });

    return c.json(response, 200);
  } catch (error) {
    logger.error("Error deleting product image:", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

// ============================================================================
// Helper Functions
// ============================================================================
