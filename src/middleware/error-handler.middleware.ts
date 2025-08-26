import { ZodError } from "zod";
import type { Context } from "hono";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { HTTPException } from "hono/http-exception";
import { AppError, ValidationError, createValidationError } from "../utils/errors";
import { getRequestContext, createErrorContext } from "./request-context.middleware";
import { formatValidationError, createSingleValidationMessage, VALIDATION_CONFIG } from "../utils/validation-errors";
import type { ApiErrorResponse } from "../types/error.types";

function sanitizeErrorMessage(message: string, isDevelopment: boolean): string {
  if (isDevelopment) {
    return message;
  }

  // In production, sanitize potentially sensitive information
  const sensitivePatterns = [/password/i, /token/i, /secret/i, /key/i, /auth/i, /credential/i];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(message)) {
      return "An error occurred while processing your request";
    }
  }

  return message;
}

export function createErrorResponse(
  error: AppError | HTTPException | Error,
  context: Context,
  isDevelopment: boolean = false
): ApiErrorResponse {
  const requestContext = getRequestContext(context);

  if (error instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: sanitizeErrorMessage(error.message, isDevelopment),
        timestamp: new Date().toISOString(),
        requestId: requestContext?.requestId,
        path: requestContext?.path,
      },
    };

    // For validation errors, include simplified details
    if (error instanceof ValidationError) {
      // Only include details if we want to show multiple errors
      if (!VALIDATION_CONFIG.firstErrorOnly && error.details?.length > 1) {
        response.error.details = error.details;
      }
      // For single error mode, the message contains all necessary information
    }

    return response;
  }

  if (error instanceof HTTPException) {
    return {
      success: false,
      error: {
        code: "HTTP_EXCEPTION" as any,
        message: sanitizeErrorMessage(error.message, isDevelopment),
        timestamp: new Date().toISOString(),
        requestId: requestContext?.requestId,
        path: requestContext?.path,
      },
    };
  }

  // Generic error
  return {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR" as any,
      message: isDevelopment ? error.message : "An internal server error occurred",
      timestamp: new Date().toISOString(),
      requestId: requestContext?.requestId,
      path: requestContext?.path,
    },
  };
}

export const errorHandlerMiddleware = (err: Error, c: Context) => {
  const isDevelopment = env.NODE_ENV === "development";
  const errorContext = createErrorContext(c);

  // Handle Zod validation errors with enhanced formatting
  if (err instanceof ZodError) {
    // Get user-friendly validation error details
    const validationDetails = formatValidationError(err, {
      firstErrorOnly: VALIDATION_CONFIG.firstErrorOnly,
      includeFieldPath: VALIDATION_CONFIG.includeFieldPath,
    });

    // Create a single, user-friendly error message
    const singleMessage = createSingleValidationMessage(err);

    const validationError = createValidationError(validationDetails, errorContext);

    // Override the default message with our user-friendly one
    validationError.message = singleMessage;

    logger.validationError("Request validation failed", {
      ...errorContext,
      metadata: {
        validationErrors: validationDetails,
        originalZodErrors: isDevelopment ? err.errors : undefined,
      },
    });

    const response = createErrorResponse(validationError, c, isDevelopment);
    return c.json(response, validationError.status);
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    const logLevel = err.status >= 500 ? "error" : "warn";

    if (logLevel === "error") {
      logger.error(`Application error: ${err.message}`, err, {
        ...errorContext,
        errorCode: err.code,
        metadata: err.context,
      });
    } else {
      logger.warn(`Client error: ${err.message}`, {
        ...errorContext,
        errorCode: err.code,
        metadata: err.context,
      });
    }

    const response = createErrorResponse(err, c, isDevelopment);
    return c.json(response, err.status);
  }

  // Handle HTTPException instances
  if (err instanceof HTTPException) {
    logger.warn(`HTTP exception: ${err.message}`, {
      ...errorContext,
      statusCode: err.status,
    });

    const response = createErrorResponse(err, c, isDevelopment);
    return c.json(response, err.status);
  }

  // Handle unexpected errors
  logger.error("Unhandled error occurred", err, {
    ...errorContext,
    metadata: {
      stack: err.stack,
      name: err.name,
    },
  });

  const response = createErrorResponse(err, c, isDevelopment);
  return c.json(response, 500);
};

// Request logging middleware
export const requestLoggingMiddleware = async (c: Context, next: Function) => {
  const requestContext = getRequestContext(c);

  if (requestContext) {
    logger.requestStart(requestContext.method, requestContext.path, {
      requestId: requestContext.requestId,
      ip: requestContext.ip,
      userAgent: requestContext.userAgent,
    });
  }

  await next();

  if (requestContext) {
    const duration = Date.now() - requestContext.startTime;
    const statusCode = c.res.status;

    logger.requestEnd(requestContext.method, requestContext.path, statusCode, duration, {
      requestId: requestContext.requestId,
      ip: requestContext.ip,
      userAgent: requestContext.userAgent,
    });
  }
};
