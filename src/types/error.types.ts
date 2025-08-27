export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",

  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",

  // Resource
  NOT_FOUND = "NOT_FOUND",
  RESOURCE_EXISTS = "RESOURCE_EXISTS",

  // Database
  DATABASE_ERROR = "DATABASE_ERROR",
  CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION",
  CONNECTION_ERROR = "CONNECTION_ERROR",

  // Business Logic
  BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
  OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED",

  // System
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // External Services
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  EMAIL_SERVICE_ERROR = "EMAIL_SERVICE_ERROR",
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    timestamp: string;
    requestId?: string;
    path?: string;
  };
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

export interface SimplifiedValidationError {
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  success: false;
  error: {
    code: "VALIDATION_ERROR";
    message: string;
    details?: ValidationErrorDetail[] | SimplifiedValidationError;
    timestamp: string;
    requestId?: string;
    path?: string;
  };
}

export interface DatabaseErrorDetail {
  table?: string;
  constraint?: string;
  column?: string;
  operation?: string;
}
