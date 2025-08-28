import { Hono } from "hono";
import * as userController from "@/controllers/user.controller";
import { compatibleZValidator } from "@/middleware/validation.middleware";
import { authMiddleware } from "@/middleware/auth.middleware";
import { updateUserProfileSchema, changePasswordSchema } from "@/db/validators";

const userRoutes = new Hono();

// All user routes require authentication
userRoutes.use("*", authMiddleware);

// ============================================================================
// User Profile Routes
// ============================================================================

/**
 * @route GET /api/users/profile
 * @desc Get current user profile
 * @access Private (Authenticated users)
 */
userRoutes.get("/profile", userController.getProfile);

/**
 * @route PATCH /api/users/profile
 * @desc Update user profile
 * @access Private (Authenticated users)
 * @body {UpdateUserProfileRequest} - Profile update data
 */
userRoutes.patch("/profile", compatibleZValidator("json", updateUserProfileSchema), userController.updateProfile);

/**
 * @route POST /api/users/change-password
 * @desc Change user password
 * @access Private (Authenticated users)
 * @body {ChangePasswordRequest} - Password change data
 */
userRoutes.post("/change-password", compatibleZValidator("json", changePasswordSchema), userController.changePassword);

export default userRoutes;
