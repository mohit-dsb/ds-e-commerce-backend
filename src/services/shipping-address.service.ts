import { db } from "@/db";
import { logger } from "@/utils/logger";
import { dbErrorHandlers } from "@/utils/database-errors";
import { createNotFoundError, createConflictError } from "@/utils/errors";
import { eq, and } from "drizzle-orm";
import { shippingAddresses, orders } from "@/db/schema";
import type { NewShippingAddress, ShippingAddress } from "@/db/validators";

// ============================================================================
// Shipping Address CRUD Operations
// ============================================================================

/**
 * Create a new shipping address for a user
 * @param addressData - Shipping address data
 * @returns Promise resolving to created shipping address
 */
export const createShippingAddress = async (
  addressData: Omit<NewShippingAddress, "id" | "createdAt" | "updatedAt">
): Promise<ShippingAddress> => {
  return dbErrorHandlers.create(async () => {
    // If this is being set as default, or if it's the user's first address, set as default
    if (addressData.isDefault) {
      // Unset any existing default for this user
      await db
        .update(shippingAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(shippingAddresses.userId, addressData.userId));
    }

    // Check if this is the user's first address
    const existingAddresses = await db
      .select({ id: shippingAddresses.id })
      .from(shippingAddresses)
      .where(eq(shippingAddresses.userId, addressData.userId))
      .limit(1);

    const shouldSetAsDefault = addressData.isDefault ?? existingAddresses.length === 0;

    const [newAddress] = await db
      .insert(shippingAddresses)
      .values({
        ...addressData,
        isDefault: shouldSetAsDefault,
      })
      .returning();

    return newAddress;
  });
};

/**
 * Get shipping address by ID
 * @param addressId - Shipping address ID
 * @returns Promise resolving to shipping address or null
 */
export const getShippingAddressById = async (addressId: string): Promise<ShippingAddress | null> => {
  try {
    const address = await db.select().from(shippingAddresses).where(eq(shippingAddresses.id, addressId)).limit(1);

    return address[0] || null;
  } catch (error) {
    logger.error("Failed to get shipping address by ID", error as Error);
    throw new Error("Failed to retrieve shipping address");
  }
};

/**
 * Get all shipping addresses for a user
 * @param userId - User ID
 * @returns Promise resolving to array of shipping addresses
 */
export const getUserShippingAddresses = async (userId: string): Promise<ShippingAddress[]> => {
  try {
    const addresses = await db
      .select()
      .from(shippingAddresses)
      .where(eq(shippingAddresses.userId, userId))
      .orderBy(shippingAddresses.isDefault);

    return addresses;
  } catch (error) {
    logger.error("Failed to get user shipping addresses", error as Error);
    throw new Error("Failed to retrieve shipping addresses");
  }
};

/**
 * Update a shipping address
 * @param addressId - Address ID to update
 * @param updateData - Partial address data to update
 * @returns Promise resolving to updated shipping address
 */
export const updateShippingAddress = async (
  addressId: string,
  updateData: Partial<Omit<NewShippingAddress, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<ShippingAddress> => {
  return dbErrorHandlers.update(async () => {
    // Check if address exists
    const existingAddress = await getShippingAddressById(addressId);
    if (!existingAddress) {
      throw createNotFoundError("Shipping address");
    }

    // If setting as default, unset other defaults for this user
    if (updateData.isDefault) {
      await db
        .update(shippingAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(shippingAddresses.userId, existingAddress.userId)
            // Don't update the current address - we'll do that separately
            // ne(shippingAddresses.id, addressId)
          )
        );
    }

    // Update the address
    const [updatedAddress] = await db
      .update(shippingAddresses)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(shippingAddresses.id, addressId))
      .returning();

    return updatedAddress;
  });
};

/**
 * Delete a shipping address
 * @param addressId - Address ID to delete
 */
export const deleteShippingAddress = async (addressId: string): Promise<void> => {
  return dbErrorHandlers.delete(async () => {
    const existingAddress = await getShippingAddressById(addressId);
    if (!existingAddress) {
      throw createNotFoundError("Shipping address");
    }

    // Check if this address is being used in orders
    const ordersUsingAddress = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.shippingAddressId, addressId))
      .limit(1);

    if (ordersUsingAddress.length > 0) {
      throw createConflictError("Cannot delete address that is being used in existing orders");
    }

    await db.delete(shippingAddresses).where(eq(shippingAddresses.id, addressId));

    // If this was the default address, set another address as default
    if (existingAddress.isDefault) {
      const nextAddress = await db
        .select()
        .from(shippingAddresses)
        .where(eq(shippingAddresses.userId, existingAddress.userId))
        .limit(1);

      if (nextAddress.length > 0) {
        await db
          .update(shippingAddresses)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(shippingAddresses.id, nextAddress[0].id));
      }
    }
  });
};

/**
 * Set a shipping address as the default for a user
 * @param userId - User ID
 * @param addressId - Address ID to set as default
 */
export const setDefaultAddress = async (userId: string, addressId: string): Promise<void> => {
  return dbErrorHandlers.update(async () => {
    return await db.transaction(async (tx) => {
      // Verify the address belongs to the user
      const address = await tx
        .select()
        .from(shippingAddresses)
        .where(and(eq(shippingAddresses.id, addressId), eq(shippingAddresses.userId, userId)))
        .limit(1);

      if (address.length === 0) {
        throw createNotFoundError("Shipping address");
      }

      // Unset all other defaults for this user
      await tx
        .update(shippingAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(shippingAddresses.userId, userId));

      // Set the specified address as default
      await tx
        .update(shippingAddresses)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(shippingAddresses.id, addressId));
    });
  });
};

/**
 * Get the default shipping address for a user
 * @param userId - User ID
 * @returns Promise resolving to default address or null
 */
export const getDefaultAddress = async (userId: string): Promise<ShippingAddress | null> => {
  try {
    const defaultAddress = await db
      .select()
      .from(shippingAddresses)
      .where(and(eq(shippingAddresses.userId, userId), eq(shippingAddresses.isDefault, true)))
      .limit(1);

    return defaultAddress[0] || null;
  } catch (error) {
    logger.error("Failed to get default shipping address", error as Error);
    throw new Error("Failed to retrieve default shipping address");
  }
};

/**
 * Check if a shipping address is being used in any orders
 * @param addressId - Address ID to check
 * @returns Promise resolving to boolean indicating if address is in use
 */
export const isAddressInUse = async (addressId: string): Promise<boolean> => {
  try {
    const ordersUsingAddress = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.shippingAddressId, addressId))
      .limit(1);

    return ordersUsingAddress.length > 0;
  } catch (error) {
    logger.error("Failed to check if address is in use", error as Error);
    throw new Error("Failed to check address usage");
  }
};
