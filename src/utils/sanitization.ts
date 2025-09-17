/**
 * Sanitizes string input by trimming whitespace and normalizing it
 * @param value - The string value to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string or null if empty after trimming
 */
export function sanitizeString(
  value: string | null | undefined,
  options: {
    toLowerCase?: boolean;
    removeExtraSpaces?: boolean;
    minLength?: number;
  } = {}
): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  let sanitized = value.trim();

  // Remove extra spaces between words if requested
  if (options.removeExtraSpaces) {
    sanitized = sanitized.replace(/\s+/g, " ");
  }

  // Convert to lowercase if requested
  if (options.toLowerCase) {
    sanitized = sanitized.toLowerCase();
  }

  // Check minimum length requirement
  if (options.minLength && sanitized.length < options.minLength) {
    return null;
  }

  return sanitized || null;
}

/**
 * Sanitizes email by trimming, lowercasing, and basic validation
 * @param email - The email to sanitize
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  const sanitized = sanitizeString(email, { toLowerCase: true });

  if (!sanitized?.includes("@")) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitizes name fields (firstName, lastName, category name, etc.)
 * @param name - The name to sanitize
 * @returns Sanitized name or null if empty
 */
export function sanitizeName(name: string | null | undefined): string | null {
  return sanitizeString(name, {
    removeExtraSpaces: true,
    minLength: 1,
  });
}

/**
 * Sanitizes description text
 * @param description - The description to sanitize
 * @returns Sanitized description or null if empty
 */
export function sanitizeDescription(description: string | null | undefined): string | null {
  return sanitizeString(description, {
    removeExtraSpaces: true,
  });
}

/**
 * Sanitizes a slug value
 * @param slug - The slug to sanitize
 * @returns Sanitized slug or null if invalid
 */
export function sanitizeSlug(slug: string | null | undefined): string | null {
  const sanitized = sanitizeString(slug, { toLowerCase: true });

  if (!sanitized) {
    return null;
  }

  // Additional slug-specific cleaning
  const cleanSlug = sanitized
    .replace(/[^a-z0-9-]/g, "-") // Replace invalid chars with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

  return cleanSlug || null;
}

/**
 * Comprehensive data sanitization for user registration data
 * @param data - User registration data
 * @returns Sanitized data
 */
export function sanitizeUserData(data: { email?: string; firstName?: string; lastName?: string; password?: string }) {
  return {
    email: sanitizeEmail(data.email),
    firstName: sanitizeName(data.firstName),
    lastName: sanitizeName(data.lastName),
    password: data.password, // Don't sanitize passwords - could break intended characters
  };
}

/**
 * Comprehensive data sanitization for category data
 * @param data - Category data
 * @returns Sanitized data
 */
export function sanitizeCategoryData(data: { name?: string; slug?: string; description?: string }) {
  return {
    name: sanitizeName(data.name),
    slug: data.slug ? sanitizeSlug(data.slug) : undefined,
    description: sanitizeDescription(data.description),
  };
}
