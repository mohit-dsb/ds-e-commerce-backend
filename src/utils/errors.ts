import { HTTPException } from "hono/http-exception";
import { ErrorCode, type ValidationErrorDetail, type DatabaseErrorDetail } from "../types/error.types";

export class AppError extends HTTPException {
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;

  constructor(code: ErrorCode, message: string, statusCode: number = 500, isOperational: boolean = true) {
    // Use a safe type assertion for known HTTP status codes
    const validStatusCode = [400, 401, 403, 404, 409, 422, 500, 503].includes(statusCode) ? statusCode : 500;
    super(validStatusCode as never, { message });
    this.code = code;
    this.isOperational = isOperational;

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class ValidationError extends AppError {
  public readonly details: ValidationErrorDetail[];

  constructor(message: string, details: ValidationErrorDetail[]) {
    super(ErrorCode.VALIDATION_ERROR, message, 400);
    this.details = details;
  }
}

export class DatabaseError extends AppError {
  public readonly details: DatabaseErrorDetail;

  constructor(message: string, details: DatabaseErrorDetail, originalError?: Error) {
    super(ErrorCode.DATABASE_ERROR, message, 500);
    this.details = details;

    // Preserve original stack trace if available
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(ErrorCode.FORBIDDEN, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(ErrorCode.NOT_FOUND, `${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCode.RESOURCE_EXISTS, message, 409);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(ErrorCode.BUSINESS_RULE_VIOLATION, message, 422);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded") {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(ErrorCode.EXTERNAL_SERVICE_ERROR, `External service error: ${service} - ${message}`, 502);
  }
}

// Helper functions for creating common errors
export const createValidationError = (errors: ValidationErrorDetail[]) => {
  // Create a more descriptive error message using the first validation error
  const [firstError] = errors;
  const errorMessage = firstError?.message ?? "Validation failed";
  return new ValidationError(errorMessage, errors);
};

export const createDatabaseError = (message: string, details: DatabaseErrorDetail, originalError?: Error) => {
  return new DatabaseError(message, details, originalError);
};

export const createAuthError = (message?: string) => {
  return new AuthenticationError(message);
};

export const createForbiddenError = (message?: string) => {
  return new AuthorizationError(message);
};

export const createNotFoundError = (resource?: string) => {
  return new NotFoundError(resource);
};

export const createConflictError = (message: string) => {
  return new ConflictError(message);
};

export const createInternalServerError = (message: string) => {
  return new AppError(ErrorCode.INTERNAL_SERVER_ERROR, message, 500);
};
