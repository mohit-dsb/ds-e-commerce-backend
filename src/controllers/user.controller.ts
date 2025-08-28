import type { Context } from "hono";
import * as userService from "@/services/user.service";
import { createSuccessResponse } from "@/utils/response";
import type { AuthContext } from "@/middleware/auth.middleware";
import { getValidatedData } from "@/middleware/validation.middleware";
import type { UpdateUserProfileRequest, ChangePasswordRequest } from "@/types/user.types";

// ============================================================================
// User Profile Controller Functions
// ============================================================================

/**
 * Get current user profile
 * GET /api/users/profile
 */
export const getProfile = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");
  const profile = await userService.getUserProfile(user.id);

  return c.json(createSuccessResponse("Profile retrieved successfully", { user: profile }), 200);
};

/**
 * Update user profile
 * PATCH /api/users/profile
 */
export const updateProfile = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");
  const updateData = getValidatedData<UpdateUserProfileRequest>(c, "json");

  const result = await userService.updateUserProfile(user.id, updateData);

  return c.json(createSuccessResponse(result.message, { user: result.user }), 200);
};

/**
 * Change user password
 * POST /api/users/change-password
 */
export const changePassword = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");
  const passwordData = getValidatedData<ChangePasswordRequest>(c, "json");

  const result = await userService.changePassword(user.id, passwordData);

  return c.json(createSuccessResponse(result.message, { user: result.user }), 200);
};
