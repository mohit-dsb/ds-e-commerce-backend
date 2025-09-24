/**
 * Hash a password using Bun's built-in password hashing
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await Bun.password.hash(password);
  } catch {
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
  } catch {
    return false;
  }
};

/**
 * Create a fast hash for refresh tokens using SHA-256
 * @param token - Token to hash
 * @returns Promise resolving to hashed token
 */
export const hashRefreshToken = async (token: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    throw new Error("Failed to hash refresh token");
  }
};
