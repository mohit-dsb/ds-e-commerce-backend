import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import { v2 as cloudinary } from "cloudinary";
import { createInternalServerError, createValidationError } from "@/utils/errors";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export interface ImageUploadOptions {
  folder?: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: "fill" | "fit" | "limit" | "scale" | "pad" | "crop";
    quality?: "auto" | number;
    format?: "auto" | "jpg" | "png" | "webp";
  };
}

// ============================================================================
// Cloudinary Configuration
// ============================================================================

let isCloudinaryConfigured = false;

/**
 * Initialize Cloudinary configuration
 */
export const initializeCloudinary = (): boolean => {
  try {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      logger.warn("Cloudinary credentials not found - image upload disabled");
      return false;
    }

    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    isCloudinaryConfigured = true;
    return true;
  } catch {
    logger.error("Failed to initialize Cloudinary");
    return false;
  }
};

/**
 * Check if Cloudinary is properly configured
 */
export const isConfigured = (): boolean => {
  return isCloudinaryConfigured;
};

// ============================================================================
// Image Upload Functions
// ============================================================================

/**
 * Upload a single image to Cloudinary
 */
export const uploadImage = async (imageBuffer: Buffer, options: ImageUploadOptions = {}): Promise<CloudinaryUploadResult> => {
  if (!isCloudinaryConfigured) {
    throw createValidationError([
      {
        field: "image",
        message: "Image upload service is not configured",
      },
    ]);
  }

  try {
    const folder = options.folder ?? "misc";

    // Convert buffer to base64 data URI
    const base64Image = `data:image/auto;base64,${imageBuffer.toString("base64")}`;

    const uploadOptions = {
      folder,
      resource_type: "image" as const,
      quality: "auto:good" as const,
      fetch_format: "auto" as const,
      flags: "lossy",
      ...(options.transformation && {
        transformation: [options.transformation],
      }),
    };

    const result = await cloudinary.uploader.upload(base64Image, uploadOptions);

    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  } catch {
    logger.error("Failed to upload image to Cloudinary");
    throw createInternalServerError("Failed to upload image");
  }
};

/**
 * Upload multiple images to Cloudinary
 */
export const uploadMultipleImages = async (
  images: Array<{ buffer: Buffer; originalName?: string }>,
  options: ImageUploadOptions = {}
): Promise<{
  success: CloudinaryUploadResult[];
  errors: Array<{ originalName?: string; error: string }>;
}> => {
  if (!isCloudinaryConfigured) {
    throw createValidationError([
      {
        field: "images",
        message: "Image upload service is not configured",
      },
    ]);
  }

  const results = {
    success: [] as CloudinaryUploadResult[],
    errors: [] as Array<{ originalName?: string; error: string }>,
  };

  // Process uploads with limited concurrency
  const BATCH_SIZE = 3;
  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (image) => {
      try {
        const result = await uploadImage(image.buffer, options);
        results.success.push(result);
      } catch (err) {
        results.errors.push({
          originalName: image.originalName,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });

    await Promise.all(batchPromises);
  }

  return results;
};

/**
 * Delete an image from Cloudinary
 */
export const deleteImage = async (publicId: string): Promise<boolean> => {
  if (!isCloudinaryConfigured) {
    logger.warn("Cloudinary not configured - cannot delete image");
    return false;
  }

  try {
    const result = (await cloudinary.uploader.destroy(publicId)) as { result: string };
    return result.result === "ok";
  } catch {
    logger.error("Failed to delete image from Cloudinary");
    return false;
  }
};

/**
 * Delete multiple images from Cloudinary
 */
export const deleteMultipleImages = async (publicIds: string[]): Promise<boolean[]> => {
  if (!isCloudinaryConfigured) {
    return publicIds.map(() => false);
  }

  const results: boolean[] = [];

  // Delete in small batches
  const BATCH_SIZE = 5;
  for (let i = 0; i < publicIds.length; i += BATCH_SIZE) {
    const batch = publicIds.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (publicId) => {
      try {
        const result = (await cloudinary.uploader.destroy(publicId)) as { result: string };
        return result.result === "ok";
      } catch {
        logger.error("Failed to delete image in batch");
        return false;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
};

// Initialize Cloudinary on module load
initializeCloudinary();
