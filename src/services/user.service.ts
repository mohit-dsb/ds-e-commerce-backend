import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { logger } from "@/utils/logger";
import { hashPassword, verifyPassword } from "@/utils/password";
import { createNotFoundError, createValidationError, createConflictError, createInternalServerError } from "@/utils/errors";
import type { UserProfile, UpdateUserProfileRequest, ChangePasswordRequest, UserOperationResult } from "@/types/user.types";

// ============================================================================
// User CRUD Functions
// ============================================================================

/**
 * Create a new user account
 * @param data - User registration data
 * @returns Promise resolving to created user
 */
export const createUser = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<UserProfile> => {
  logger.info("Creating new user", { metadata: { email: data.email } });

  const hashedPassword = await hashPassword(data.password);

  const [user] = await db
    .insert(users)
    .values({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
    })
    .returning();

  if (!user) {
    throw createInternalServerError("Failed to create user account");
  }

  logger.info("User created successfully", {
    metadata: { userId: user.id, email: data.email },
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    phoneNumber: null, // Phone numbers are stored in shipping addresses
  };
};

/**
 * Retrieve a user by email address
 * @param email - Email address to search for
 * @returns Promise resolving to user or null if not found
 */
export const getUserByEmail = async (email: string): Promise<UserProfile | null> => {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isVerified: users.isVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    return null;
  }

  return {
    ...user,
    phoneNumber: null, // Phone numbers are stored in shipping addresses
  };
};

/**
 * Retrieve a user by ID
 * @param id - User ID to search for
 * @returns Promise resolving to user or null if not found
 */
export const getUserById = async (id: string): Promise<UserProfile | null> => {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isVerified: users.isVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id));

  if (!user) {
    return null;
  }

  return {
    ...user,
    phoneNumber: null, // Phone numbers are stored in shipping addresses
  };
};

// ============================================================================
// User Profile Management Functions
// ============================================================================

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  logger.info("Fetching user profile", { metadata: { userId } });

  const user = await getUserById(userId);
  if (!user) {
    throw createNotFoundError("User");
  }

  return user;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updateData: UpdateUserProfileRequest): Promise<UserOperationResult> => {
  logger.info("Updating user profile", { metadata: { userId } });

  // Check if user exists
  const existingUser = await getUserById(userId);
  if (!existingUser) {
    throw createNotFoundError("User");
  }

  // Check email uniqueness if email is being updated
  if (updateData.email && updateData.email !== existingUser.email) {
    const emailExists = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, updateData.email)))
      .limit(1);

    if (emailExists[0] && emailExists[0].id !== userId) {
      throw createConflictError("Email address already exists");
    }
  }

  // Prepare update data (phoneNumber is handled in shipping addresses)
  const updateFields = {
    firstName: updateData.firstName,
    lastName: updateData.lastName,
    email: updateData.email,
  };

  // Remove undefined fields
  const validUpdateData = Object.fromEntries(Object.entries(updateFields).filter(([, value]) => value !== undefined));

  // Update user
  const updatedUser = await db
    .update(users)
    .set({
      ...validUpdateData,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isVerified: users.isVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  if (!updatedUser[0]) {
    throw createInternalServerError("Failed to update user profile");
  }

  return {
    user: {
      ...updatedUser[0],
      phoneNumber: null, // Phone numbers are stored in shipping addresses
    },
    message: "Profile updated successfully",
  };
};

/**
 * Change user password
 */
export const changePassword = async (userId: string, passwordData: ChangePasswordRequest): Promise<UserOperationResult> => {
  logger.info("Changing user password", { metadata: { userId } });

  // Get current user with password
  const currentUser = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isVerified: users.isVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      password: users.password,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!currentUser[0]) {
    throw createNotFoundError("User");
  }

  // Verify current password
  const isCurrentPasswordValid = await verifyPassword(passwordData.currentPassword, currentUser[0].password);

  if (!isCurrentPasswordValid) {
    throw createValidationError([
      {
        field: "currentPassword",
        message: "Current password is incorrect",
      },
    ]);
  }

  // Hash new password
  const hashedNewPassword = await hashPassword(passwordData.newPassword);

  // Update password
  const updatedUser = await db
    .update(users)
    .set({
      password: hashedNewPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isVerified: users.isVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  if (!updatedUser[0]) {
    throw createInternalServerError("Failed to update password");
  }

  return {
    user: {
      ...updatedUser[0],
      phoneNumber: null, // Phone numbers are stored in shipping addresses
    },
    message: "Password changed successfully",
  };
};

/**
 * Update user password (for password reset functionality)
 * @param userId - ID of user to update password for
 * @param newPassword - New plain text password
 */
export const updatePassword = async (userId: string, newPassword: string): Promise<void> => {
  // Verify user exists
  const user = await getUserById(userId);
  if (!user) {
    throw createNotFoundError("User");
  }

  const hashedPassword = await hashPassword(newPassword);
  await db
    .update(users)
    .set({
      password: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  logger.info("User password updated", {
    metadata: { userId },
  });
};
