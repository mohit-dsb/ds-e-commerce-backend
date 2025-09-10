// Rate Limiting
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100, // limit each IP to 100 requests per windowMs
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Validation
export const VALIDATION_CONFIG = {
  firstErrorOnly: true,
  includeFieldPath: true,
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB default
  UPLOAD_PATH: "./uploads", // Default path
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"] as const,
} as const;

// Database
export const DATABASE = {
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  QUERY_TIMEOUT: 15000, // 15 seconds
  MAX_CONNECTIONS: 20,
} as const;

// Password Reset
export const PASSWORD_RESET = {
  TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour in milliseconds
  MAX_ATTEMPTS: 5,
} as const;

// API Response
export const API_RESPONSE = {
  DEFAULT_SUCCESS_MESSAGE: "Operation completed successfully",
  DEFAULT_ERROR_MESSAGE: "An error occurred",
} as const;

// User Roles
export const USER_ROLES = {
  CUSTOMER: "customer",
  ADMIN: "admin",
} as const;

// Category Hierarchy
export const CATEGORY = {
  MAX_DEPTH: 5,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
} as const;
