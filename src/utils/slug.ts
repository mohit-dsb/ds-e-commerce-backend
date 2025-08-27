/**
 * Generate a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @returns A clean, URL-friendly slug
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== "string") {
    throw new Error("Text is required to generate a slug");
  }

  return text
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing whitespace
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+/, "") // Remove leading hyphens
    .replace(/-+$/, ""); // Remove trailing hyphens
}

/**
 * Generate a unique slug by appending a number if the base slug already exists
 * @param baseSlug - The base slug to make unique
 * @param checkExists - Function to check if a slug already exists
 * @returns A unique slug
 */
export async function generateUniqueSlug(baseSlug: string, checkExists: (slug: string) => Promise<boolean>): Promise<string> {
  let uniqueSlug = baseSlug;
  let counter = 1;

  // Keep checking and incrementing until we find a unique slug
  while (await checkExists(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}

/**
 * Validate if a string is a valid slug format
 * @param slug - The slug to validate
 * @returns Boolean indicating if the slug is valid
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== "string") {
    return false;
  }

  // Check if slug matches the expected pattern
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug) && slug.length <= 100;
}
