import type { Context } from "hono";
import { logger } from "@/utils/logger";
import { createSuccessResponse } from "@/utils/response";
import type { AuthContext } from "@/middleware/auth.middleware";
import { getValidatedData } from "@/middleware/validation.middleware";
import * as shippingAddressService from "@/services/shipping-address.service";
import { createNotFoundError, createValidationError, createAuthError } from "@/utils/errors";
import type { insertShippingAddressSchema, updateShippingAddressSchema } from "@/db/validators";

// ============================================================================
// Type Definitions
// ============================================================================

type CreateShippingAddressData = typeof insertShippingAddressSchema._type;
type UpdateShippingAddressData = typeof updateShippingAddressSchema._type;

// ============================================================================
// Shipping Address Controller Functions
// ============================================================================

/**
 * Create a new shipping address
 * @desc Create a new shipping address for the authenticated user
 * @access Private (Customer/Admin)
 */
export const createShippingAddress = async (c: Context<{ Variables: AuthContext }>) => {
  const validatedData = getValidatedData<CreateShippingAddressData>(c, "json");
  const user = c.get("user");

  const addressData = {
    ...validatedData,
    userId: user.id,
  };

  try {
    const address = await shippingAddressService.createShippingAddress(addressData);

    return c.json(createSuccessResponse("Shipping address created successfully", { address }), 201);
  } catch (error) {
    logger.error("Shipping address creation failed", error as Error, {
      metadata: { userId: user.id },
    });
    throw error;
  }
};

/**
 * Get user's shipping addresses
 * @desc Get all shipping addresses for the authenticated user
 * @access Private (Customer/Admin)
 */
export const getShippingAddresses = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");

  const addresses = await shippingAddressService.getUserShippingAddresses(user.id);

  return c.json(createSuccessResponse("Shipping addresses retrieved successfully", { addresses }));
};

/**
 * Get shipping address by ID
 * @desc Get a specific shipping address by ID
 * @access Private (Customer can only view own addresses, Admin can view all)
 */
export const getShippingAddress = async (c: Context<{ Variables: AuthContext }>) => {
  const addressId = c.req.param("id");
  const user = c.get("user");

  if (!addressId) {
    throw createValidationError([{ field: "id", message: "Address ID is required" }]);
  }

  const address = await shippingAddressService.getShippingAddressById(addressId);
  if (!address) {
    throw createNotFoundError("Shipping address");
  }

  // Authorization check: users can only view their own addresses, admins can view all
  if (user.role !== "admin" && address.userId !== user.id) {
    throw createAuthError("You don't have permission to view this address");
  }

  return c.json(createSuccessResponse("Shipping address retrieved successfully", { address }));
};

/**
 * Update shipping address
 * @desc Update an existing shipping address
 * @access Private (Customer can only update own addresses, Admin can update all)
 */
export const updateShippingAddress = async (c: Context<{ Variables: AuthContext }>) => {
  const addressId = c.req.param("id");
  const validatedData = getValidatedData<UpdateShippingAddressData>(c, "json");
  const user = c.get("user");

  if (!addressId) {
    throw createValidationError([{ field: "id", message: "Address ID is required" }]);
  }

  // Check if address exists and user has permission
  const existingAddress = await shippingAddressService.getShippingAddressById(addressId);
  if (!existingAddress) {
    throw createNotFoundError("Shipping address");
  }

  if (user.role !== "admin" && existingAddress.userId !== user.id) {
    throw createAuthError("You don't have permission to update this address");
  }

  try {
    const updatedAddress = await shippingAddressService.updateShippingAddress(addressId, validatedData);

    return c.json(createSuccessResponse("Shipping address updated successfully", { address: updatedAddress }));
  } catch (error) {
    logger.error("Shipping address update failed", error as Error, {
      metadata: { addressId, userId: user.id },
    });
    throw error;
  }
};

/**
 * Delete shipping address
 * @desc Delete a shipping address (soft delete)
 * @access Private (Customer can only delete own addresses, Admin can delete all)
 */
export const deleteShippingAddress = async (c: Context<{ Variables: AuthContext }>) => {
  const addressId = c.req.param("id");
  const user = c.get("user");

  if (!addressId) {
    throw createValidationError([{ field: "id", message: "Address ID is required" }]);
  }

  // Check if address exists and user has permission
  const existingAddress = await shippingAddressService.getShippingAddressById(addressId);
  if (!existingAddress) {
    throw createNotFoundError("Shipping address");
  }

  if (user.role !== "admin" && existingAddress.userId !== user.id) {
    throw createAuthError("You don't have permission to delete this address");
  }

  // Check if address is being used in any orders
  const isInUse = await shippingAddressService.isAddressInUse(addressId);
  if (isInUse) {
    throw createValidationError([
      {
        field: "address",
        message: "Cannot delete address that is being used in existing orders",
      },
    ]);
  }

  try {
    await shippingAddressService.deleteShippingAddress(addressId);

    return c.json(createSuccessResponse("Shipping address deleted successfully"));
  } catch (error) {
    logger.error("Shipping address deletion failed", error as Error, {
      metadata: { addressId, userId: user.id },
    });
    throw error;
  }
};

/**
 * Set default shipping address
 * @desc Set a shipping address as the default for the user
 * @access Private (Customer can only set own default, Admin can set for any user)
 */
export const setDefaultShippingAddress = async (c: Context<{ Variables: AuthContext }>) => {
  const addressId = c.req.param("id");
  const user = c.get("user");

  if (!addressId) {
    throw createValidationError([{ field: "id", message: "Address ID is required" }]);
  }

  // Check if address exists and user has permission
  const existingAddress = await shippingAddressService.getShippingAddressById(addressId);
  if (!existingAddress) {
    throw createNotFoundError("Shipping address");
  }

  if (user.role !== "admin" && existingAddress.userId !== user.id) {
    throw createAuthError("You don't have permission to modify this address");
  }

  try {
    await shippingAddressService.setDefaultAddress(existingAddress.userId, addressId);

    return c.json(createSuccessResponse("Default shipping address set successfully"));
  } catch (error) {
    logger.error("Set default address failed", error as Error, {
      metadata: { addressId, userId: user.id },
    });
    throw error;
  }
};

/**
 * Get user's default shipping address
 * @desc Get the default shipping address for the authenticated user
 * @access Private (Customer/Admin)
 */
export const getDefaultShippingAddress = async (c: Context<{ Variables: AuthContext }>) => {
  const user = c.get("user");

  const defaultAddress = await shippingAddressService.getDefaultAddress(user.id);

  if (!defaultAddress) {
    return c.json(createSuccessResponse("No default shipping address found", { address: null }));
  }

  return c.json(createSuccessResponse("Default shipping address retrieved successfully", { address: defaultAddress }));
};
