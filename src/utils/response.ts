import type { ApiSuccessResponse } from "../types/api.types";

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T = any>(
  message: string,
  data?: T
): ApiSuccessResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Create a paginated success response
 */
export function createPaginatedResponse<T = any>(
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
