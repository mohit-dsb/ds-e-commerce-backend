// Re-export error types to maintain compatibility
export type {
  ApiErrorResponse,
  ValidationErrorResponse,
  ErrorContext
} from "./error.types";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    path?: string;
  };
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isVerified: boolean;
  };
  token: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  success: true;
  message?: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Legacy - kept for backward compatibility but deprecated
/** @deprecated Use ApiErrorResponse from error.types instead */
export interface ErrorResponse {
  error: string;
  details?: any;
}
