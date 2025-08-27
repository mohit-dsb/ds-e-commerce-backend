import { ZodSchema } from "zod";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createValidationError } from "@/utils/errors";
import { formatValidationError, createSingleValidationMessage, VALIDATION_CONFIG } from "@/utils/validation-errors";

/**
 * Helper to get validated data from context
 */
export function getValidatedData<T>(c: Context, target: "json" | "query" | "param"): T {
  const {req} = c;
  return req.valid(target) as T;
}

/**
 * Legacy compatibility - wrapper around hono's zValidator with enhanced error handling
 */
export function compatibleZValidator<T>(target: "json" | "query" | "param", schema: ZodSchema<T> | any) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      const validationDetails = formatValidationError(result.error, VALIDATION_CONFIG);
      const singleMessage = createSingleValidationMessage(result.error);

      const validationError = createValidationError(validationDetails);
      validationError.message = singleMessage;

      throw validationError;
    }
  });
}
