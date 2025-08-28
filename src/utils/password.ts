import { logger } from "@/utils/logger";

/**
 * Hash a password using Bun's built-in password hashing
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await Bun.password.hash(password);
  } catch (error) {
    logger.error("Password hashing failed", error as Error, {});
    throw new Error("Failed to process password");
  }
};

/**
 * Verify a password against its hash using Bun's built-in password verification
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to compare against
 * @returns Promise resolving to boolean indicating if password is valid
 */
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    return await Bun.password.verify(password, hashedPassword);
  } catch (error) {
    logger.error("Password verification failed", error as Error, {});
    return false;
  }
};
