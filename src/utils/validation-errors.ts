import { ZodError } from "zod";
import type { ValidationErrorDetail } from "@/types/error.types";

// Type for individual Zod issues
type ZodIssue = ZodError["issues"][number];

// Type for error objects that have issues (compatible with both ZodError and $ZodError)
type ZodErrorLike = {
  issues: ZodIssue[];
};

/**
 * Field mapping for user-friendly field names
 */
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  // User fields
  email: "Email Address",
  firstName: "First Name",
  lastName: "Last Name",
  dateOfBirth: "Date of Birth",
  profileImageUrl: "Profile Image URL",

  // Authentication fields
  password: "Password",
  confirmPassword: "Confirm Password",
  currentPassword: "Current Password",
  newPassword: "New Password",
  refreshToken: "Refresh Token",

  // Product fields
  name: "Product Name",
  description: "Product Description",
  price: "Product Price",
  weight: "Product Weight",
  weightUnit: "Weight Unit",
  status: "Product Status",
  inventoryQuantity: "Inventory Quantity",
  images: "Product Images",
  tags: "Product Tags",
  categoryId: "Product Category",

  // Category fields
  categoryName: "Category Name",
  parentCategoryId: "Parent Category",

  // Order fields
  orderStatus: "Order Status",
  totalAmount: "Total Amount",
  shippingCost: "Shipping Cost",

  // Address fields
  street: "Street Address",
  city: "City",
  state: "State/Province",
  zipCode: "ZIP/Postal Code",
  country: "Country",

  // Common fields
  id: "ID",
  createdAt: "Created Date",
  updatedAt: "Updated Date",
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
      // Check if it's a required field (undefined/null input)
      if (issue.message?.includes("required") || issue.message?.includes("undefined") || issue.message?.includes("null")) {
        return `${fieldName} is required`;
      }
      return `${fieldName} must be a valid ${issue.expected}`;

    case "too_small":
      if ("minimum" in issue) {
        if (issue.origin === "string") {
          if (issue.minimum === 1) {
            return `${fieldName} is required`;
          }
          return `${fieldName} must be at least ${issue.minimum} characters long`;
        }
        if (issue.origin === "number") {
          return `${fieldName} must be at least ${issue.minimum}`;
        }
        if (issue.origin === "array") {
          return `${fieldName} must contain at least ${issue.minimum} item(s)`;
        }
      }
      return `${fieldName} is too short`;

    case "too_big":
      if ("maximum" in issue) {
        if (issue.origin === "string") {
          return `${fieldName} must be no more than ${issue.maximum} characters long`;
        }
        if (issue.origin === "number") {
          return `${fieldName} must be no more than ${issue.maximum}`;
        }
        if (issue.origin === "array") {
          return `${fieldName} must contain no more than ${issue.maximum} item(s)`;
        }
      }
      return `${fieldName} is too long`;

    case "invalid_format":
      if ("format" in issue) {
        if (issue.format === "email") {
          return `${fieldName} must be a valid email address`;
        }
        if (issue.format === "url") {
          return `${fieldName} must be a valid URL`;
        }
        if (issue.format === "uuid") {
          return `${fieldName} must be a valid UUID`;
        }
        if (issue.format === "regex") {
          // Handle specific regex patterns
          if (field === "password") {
            return "Password must contain at least one uppercase letter, one lowercase letter, and one number";
          }
          if (field === "phoneNumber") {
            return "Phone number must be in a valid format";
          }
          return `${fieldName} format is invalid`;
        }
      }
      return `${fieldName} format is invalid`;

    case "invalid_value":
      if ("values" in issue && Array.isArray(issue.values)) {
        const options = (issue.values as string[]).join(", ");
        return `${fieldName} must be one of: ${options}`;
      }
      return `${fieldName} has an invalid value`;

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
  zodError: ZodErrorLike,
  options: {
    firstErrorOnly?: boolean;
    includeFieldPath?: boolean;
  } = {}
): ValidationErrorDetail[] {
  const { firstErrorOnly = true, includeFieldPath = false } = options;

  // Safety check for errors array
  if (!zodError?.issues || zodError.issues.length === 0) {
    return [
      {
        field: "request",
        message: "Invalid request data",
        value: undefined,
      },
    ];
  }

  // Get all errors or just the first one
  const errorsToProcess = firstErrorOnly ? [zodError.issues[0]] : zodError.issues;

  return errorsToProcess.filter(Boolean).map((issue: ZodIssue) => {
    const field = issue.path.join(".");
    const userFriendlyMessage = generateUserFriendlyMessage(issue);

    return {
      field: includeFieldPath ? field : getFieldDisplayName(field),
      message: userFriendlyMessage,
      value: issue.code === "invalid_type" ? undefined : undefined,
    };
  });
}

/**
 * Create a single, user-friendly validation error message
 */
export function createSingleValidationMessage(zodError: ZodErrorLike): string {
  // Check if we have a valid ZodError with errors
  if (!zodError?.issues || zodError.issues.length === 0) {
    return "Invalid request data";
  }

  const [firstError] = zodError.issues;
  if (!firstError) {
    return "Invalid request data";
  }

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
  maxMessageLength: 500,
} as const;

/**
 * Enhanced validation configuration for detailed errors (like product creation)
 */
export const DETAILED_VALIDATION_CONFIG = {
  // Return all errors for detailed feedback
  firstErrorOnly: false,
  // Include field information for clarity
  includeFieldPath: true,
  // Allow longer messages for detailed explanations
  maxMessageLength: 800,
} as const;
