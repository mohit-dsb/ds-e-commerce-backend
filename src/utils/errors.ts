import { HTTPException } from "hono/http-exception";
import { ErrorCode, type ErrorContext, type ValidationErrorDetail, type DatabaseErrorDetail } from "../types/error.types";

export class AppError extends HTTPException {
  public readonly code: ErrorCode;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    context: ErrorContext = {},
    isOperational: boolean = true
  ) {
    // Use a safe type assertion for known HTTP status codes
    const validStatusCode = [400, 401, 403, 404, 409, 422, 500, 503].includes(statusCode) ? statusCode : 500;
    super(validStatusCode as never, { message });
    this.code = code;
    this.context = {
      ...context,
      timestamp: new Date().toISOString(),
    };
    this.isOperational = isOperational;

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class ValidationError extends AppError {
  public readonly details: ValidationErrorDetail[];

  constructor(message: string, details: ValidationErrorDetail[], context: ErrorContext = {}) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, context);
    this.details = details;
  }
}

export class DatabaseError extends AppError {
  public readonly details: DatabaseErrorDetail;

  constructor(message: string, details: DatabaseErrorDetail, context: ErrorContext = {}, originalError?: Error) {
    super(ErrorCode.DATABASE_ERROR, message, 500, context);
    this.details = details;

    // Preserve original stack trace if available
    if (originalError?.stack) {
      this.context.stack = originalError.stack;
    }
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required", context: ErrorContext = {}) {
    super(ErrorCode.UNAUTHORIZED, message, 401, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions", context: ErrorContext = {}) {
    super(ErrorCode.FORBIDDEN, message, 403, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource", context: ErrorContext = {}) {
    super(ErrorCode.NOT_FOUND, `${resource} not found`, 404, context);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(ErrorCode.RESOURCE_EXISTS, message, 409, context);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(ErrorCode.BUSINESS_RULE_VIOLATION, message, 422, context);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded", context: ErrorContext = {}) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429, context);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context: ErrorContext = {}) {
    super(ErrorCode.EXTERNAL_SERVICE_ERROR, `External service error: ${service} - ${message}`, 502, context);
  }
}

// Helper functions for creating common errors
export const createValidationError = (errors: ValidationErrorDetail[], context?: ErrorContext) => {
  return new ValidationError("Validation failed", errors, context);
};

export const createDatabaseError = (
  message: string,
  details: DatabaseErrorDetail,
  context?: ErrorContext,
  originalError?: Error
) => {
  return new DatabaseError(message, details, context, originalError);
};

export const createAuthError = (message?: string, context?: ErrorContext) => {
  return new AuthenticationError(message, context);
};

export const createForbiddenError = (message?: string, context?: ErrorContext) => {
  return new AuthorizationError(message, context);
};

export const createNotFoundError = (resource?: string, context?: ErrorContext) => {
  return new NotFoundError(resource, context);
};

export const createConflictError = (message: string, context?: ErrorContext) => {
  return new ConflictError(message, context);
};
