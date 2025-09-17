import { ZodError } from "zod";
import type { Context } from "hono";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import { HTTPException } from "hono/http-exception";
import type { ApiErrorResponse, ErrorCode } from "@/types/error.types";
import { AppError, ValidationError, createValidationError } from "@/utils/errors";
import { formatValidationError, createSingleValidationMessage, VALIDATION_CONFIG } from "@/utils/validation-errors";

export function createErrorResponse(
  error: AppError | HTTPException | Error,
  context: Context,
  isDevelopment: boolean = false
): ApiErrorResponse {
  if (error instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
        path: context.req.path,
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
        code: "HTTP_EXCEPTION" as ErrorCode,
        message: error.message,
        timestamp: new Date().toISOString(),
        path: context.req.path,
      },
    };
  }

  // Generic error
  return {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR" as ErrorCode,
      message: isDevelopment ? error.message : "An internal server error occurred",
      timestamp: new Date().toISOString(),
      path: context.req.path,
    },
  };
}

export const errorHandlerMiddleware = (err: Error, c: Context) => {
  const isDevelopment = env.NODE_ENV === "development";

  // Handle Zod validation errors with enhanced formatting
  if (err instanceof ZodError) {
    // Get user-friendly validation error details
    const validationDetails = formatValidationError(err, {
      firstErrorOnly: VALIDATION_CONFIG.firstErrorOnly,
      includeFieldPath: VALIDATION_CONFIG.includeFieldPath,
    });

    // Create a single, user-friendly error message
    const singleMessage = createSingleValidationMessage(err);

    const validationError = createValidationError(validationDetails);

    // Override the default message with our user-friendly one
    validationError.message = singleMessage;

    logger.validationError("Request validation failed", {
      metadata: {
        validationErrors: validationDetails,
        originalZodErrors: isDevelopment ? err.issues : undefined,
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
        errorCode: err.code,
      });
    } else {
      logger.warn(`Client error: ${err.message}`, {
        errorCode: err.code,
      });
    }

    const response = createErrorResponse(err, c, isDevelopment);
    return c.json(response, err.status);
  }

  // Handle HTTPException instances
  if (err instanceof HTTPException) {
    logger.warn(`HTTP exception: ${err.message}`, {
      statusCode: err.status,
    });

    const response = createErrorResponse(err, c, isDevelopment);
    return c.json(response, err.status);
  }

  // Handle unexpected errors
  logger.error("Unhandled error occurred", err, {
    metadata: {
      stack: err.stack,
      name: err.name,
    },
  });

  const response = createErrorResponse(err, c, isDevelopment);
  return c.json(response, 500);
};
