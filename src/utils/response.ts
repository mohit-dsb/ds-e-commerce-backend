import { Context } from "hono";
import * as authService from "@/services/auth.service";
import type { ApiSuccessResponse } from "../types/api.types";

// Helper function to extract device metadata from request
export const extractDeviceMetadata = (c: Context): authService.RefreshTokenMetadata => {
  const userAgent = c.req.header("User-Agent") ?? undefined;
  const forwardedFor = c.req.header("X-Forwarded-For");
  const realIP = c.req.header("X-Real-IP");

  const ipAddress = forwardedFor?.split(",")[0] ?? realIP ?? undefined;

  // Simple device fingerprinting (in production, use more sophisticated methods)
  const deviceFingerprint =
    userAgent && ipAddress ? Buffer.from(`${userAgent}:${ipAddress}`).toString("base64").substring(0, 32) : undefined;

  return { ipAddress, userAgent, deviceFingerprint };
};

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T = unknown>(message: string, data?: T): ApiSuccessResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Create a paginated success response
 */
export function createPaginatedResponse<T = unknown>(
  message: string,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
): ApiSuccessResponse<{
  items: T[];
  pagination: typeof pagination;
}> {
  return {
    success: true,
    message,
    data: {
      items: data,
      pagination,
    },
  };
}
