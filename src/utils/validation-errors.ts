import { ZodError, ZodIssue } from "zod";
import type { ValidationErrorDetail } from "../types/error.types";

/**
 * Field mapping for user-friendly field names
 */
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  email: "Email",
  password: "Password",
  firstName: "First name",
  lastName: "Last name",
  token: "Token",
  confirmPassword: "Confirm password",
  phoneNumber: "Phone number",
  dateOfBirth: "Date of birth",
  address: "Address",
  city: "City",
  state: "State",
  zipCode: "ZIP code",
  country: "Country",
};

/**
 * Get user-friendly field name
 */
function getFieldDisplayName(field: string): string {
  return FIELD_DISPLAY_NAMES[field] || field.charAt(0).toUpperCase() + field.slice(1);
}

/**
 * Generate user-friendly validation error message
 */
function generateUserFriendlyMessage(issue: ZodIssue): string {
  const field = issue.path.join(".");
  const fieldName = getFieldDisplayName(field);

  switch (issue.code) {
    case "invalid_type":
      if (issue.expected === "string" && issue.received === "undefined") {
        return `${fieldName} is required`;
      }
      if (issue.expected === "number" && issue.received === "undefined") {
        return `${fieldName} is required`;
      }
      if (issue.expected === "boolean" && issue.received === "undefined") {
        return `${fieldName} is required`;
      }
      return `${fieldName} must be a valid ${issue.expected}`;

    case "too_small":
      if (issue.type === "string") {
        if (issue.minimum === 1) {
          return `${fieldName} is required`;
        }
        return `${fieldName} must be at least ${issue.minimum} characters long`;
      }
      if (issue.type === "number") {
        return `${fieldName} must be at least ${issue.minimum}`;
      }
      if (issue.type === "array") {
        return `${fieldName} must contain at least ${issue.minimum} item(s)`;
      }
      return `${fieldName} is too short`;

    case "too_big":
      if (issue.type === "string") {
        return `${fieldName} must be no more than ${issue.maximum} characters long`;
      }
      if (issue.type === "number") {
        return `${fieldName} must be no more than ${issue.maximum}`;
      }
      if (issue.type === "array") {
        return `${fieldName} must contain no more than ${issue.maximum} item(s)`;
      }
      return `${fieldName} is too long`;

    case "invalid_string":
      if (issue.validation === "email") {
        return `${fieldName} must be a valid email address`;
      }
      if (issue.validation === "url") {
        return `${fieldName} must be a valid URL`;
      }
      if (issue.validation === "uuid") {
        return `${fieldName} must be a valid UUID`;
      }
      if (issue.validation === "regex") {
        // Handle specific regex patterns
        if (field === "password") {
          return "Password must contain at least one uppercase letter, one lowercase letter, and one number";
        }
        if (field === "phoneNumber") {
          return "Phone number must be in a valid format";
        }
        return `${fieldName} format is invalid`;
      }
      return `${fieldName} format is invalid`;

    case "invalid_enum_value":
      const options = issue.options?.join(", ");
      return `${fieldName} must be one of: ${options}`;

    case "invalid_date":
      return `${fieldName} must be a valid date`;

    case "custom":
      // Handle custom validation messages
      return issue.message || `${fieldName} is invalid`;

    default:
      return issue.message || `${fieldName} is invalid`;
  }
}

/**
 * Enhanced Zod error formatter that returns user-friendly messages
 * and optionally returns only the first error
 */
export function formatValidationError(
  zodError: ZodError,
  options: {
    firstErrorOnly?: boolean;
    includeFieldPath?: boolean;
  } = {}
): ValidationErrorDetail[] {
  const { firstErrorOnly = true, includeFieldPath = false } = options;

  // Get all errors or just the first one
  const errorsToProcess = firstErrorOnly ? [zodError.errors[0]] : zodError.errors;

  return errorsToProcess.map((issue) => {
    const field = issue.path.join(".");
    const userFriendlyMessage = generateUserFriendlyMessage(issue);

    return {
      field: includeFieldPath ? field : getFieldDisplayName(field),
      message: userFriendlyMessage,
      value: issue.code === "invalid_type" ? undefined : (issue as any).received,
    };
  });
}

/**
 * Create a single, user-friendly validation error message
 */
export function createSingleValidationMessage(zodError: ZodError): string {
  const firstError = zodError.errors[0];
  return generateUserFriendlyMessage(firstError);
}

/**
 * Validation error configuration
 */
export const VALIDATION_CONFIG = {
  // Return only the first error by default
  firstErrorOnly: true,
  // Don't include technical field paths in user-facing messages
  includeFieldPath: false,
  // Maximum message length for security
  maxMessageLength: 200,
} as const;
