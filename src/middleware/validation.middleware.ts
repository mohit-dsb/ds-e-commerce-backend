import type { Context, Next } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ZodSchema, ZodError } from "zod";
import { createValidationError } from "../utils/errors";
import { formatValidationError, createSingleValidationMessage, VALIDATION_CONFIG } from "../utils/validation-errors";
import { createErrorContext } from "../middleware/request-context.middleware";
import { logger } from "../utils/logger";

/**
 * Enhanced validation middleware with user-friendly error messages
 */
export function enhancedValidator<T>(
  target: "json" | "query" | "param" | "header" | "cookie",
  schema: ZodSchema<T>,
  options: {
    firstErrorOnly?: boolean;
    includeFieldPath?: boolean;
  } = {}
) {
  const { firstErrorOnly = true, includeFieldPath = false } = options;

  return async (c: Context, next: Next) => {
    try {
      let data: any;

      switch (target) {
        case "json":
          data = await c.req.json();
          break;
        case "query":
          data = c.req.query();
          break;
        case "param":
          data = c.req.param();
          break;
        case "header":
          data = Object.fromEntries(c.req.raw.headers.entries());
          break;
        case "cookie":
          data = {}; // Cookie parsing would need additional implementation
          break;
        default:
          throw new Error(`Unsupported validation target: ${target}`);
      }

      // Validate the data
      const result = schema.safeParse(data);

      if (!result.success) {
        const errorContext = createErrorContext(c);

        // Format the validation error with enhanced messaging
        const validationDetails = formatValidationError(result.error, {
          firstErrorOnly,
          includeFieldPath,
        });

        // Create a single, user-friendly error message
        const singleMessage = createSingleValidationMessage(result.error);

        logger.validationError("Enhanced validation failed", {
          ...errorContext,
          metadata: {
            target,
            validationErrors: validationDetails,
            originalData: data,
          },
        });

        // Create and throw the validation error
        const validationError = createValidationError(validationDetails, errorContext);
        validationError.message = singleMessage;

        throw validationError;
      }

      // Store the validated data in the context
      c.set(`validated_${target}`, result.data);

      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Handle ZodError specifically
        const errorContext = createErrorContext(c);
        const validationDetails = formatValidationError(error, {
          firstErrorOnly,
          includeFieldPath,
        });
        const singleMessage = createSingleValidationMessage(error);

        const validationError = createValidationError(validationDetails, errorContext);
        validationError.message = singleMessage;

        throw validationError;
      }

      // Re-throw other errors
      throw error;
    }
  };
}

/**
 * Convenience functions for common validation targets
 */
export const validateJson = <T>(
  schema: ZodSchema<T>,
  options?: { firstErrorOnly?: boolean; includeFieldPath?: boolean }
) => enhancedValidator("json", schema, options);

export const validateQuery = <T>(
  schema: ZodSchema<T>,
  options?: { firstErrorOnly?: boolean; includeFieldPath?: boolean }
) => enhancedValidator("query", schema, options);

export const validateParam = <T>(
  schema: ZodSchema<T>,
  options?: { firstErrorOnly?: boolean; includeFieldPath?: boolean }
) => enhancedValidator("param", schema, options);

/**
 * Helper to get validated data from context
 */
export function getValidatedData<T>(c: Context, target: "json" | "query" | "param"): T {
  return c.get(`validated_${target}`) as T;
}

/**
 * Legacy compatibility - wrapper around hono's zValidator with enhanced error handling
 */
export function compatibleZValidator<T>(target: "json" | "query" | "param", schema: ZodSchema<T>) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const errorContext = createErrorContext(c);
      const validationDetails = formatValidationError(result.error, VALIDATION_CONFIG);
      const singleMessage = createSingleValidationMessage(result.error);

      const validationError = createValidationError(validationDetails, errorContext);
      validationError.message = singleMessage;

      throw validationError;
    }
  });
}
