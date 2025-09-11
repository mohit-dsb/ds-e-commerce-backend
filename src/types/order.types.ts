import type { InferSelectModel } from "drizzle-orm";
import type { orders, orderItems, orderStatusHistory, shippingAddresses } from "@/db/schema";

// Base types from schema
export type Order = InferSelectModel<typeof orders>;
export type OrderItem = InferSelectModel<typeof orderItems>;
export type OrderStatusHistory = InferSelectModel<typeof orderStatusHistory>;
export type ShippingAddress = InferSelectModel<typeof shippingAddresses>;

// Extended types with relations
export interface OrderWithRelations extends Order {
  orderItems?: (OrderItem & {
    product?: {
      id: string;
      name: string;
      slug: string;
      price: string;
      status: string;
      inventoryQuantity: number | null;
    };
  })[];
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  shippingAddress?: ShippingAddress;
  statusHistory?: (OrderStatusHistory & {
    changedBy?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  })[];
}

// Order creation types
export interface CreateOrderItem {
  productId: string;
  quantity: number;
  productVariant?: {
    size?: string;
    color?: string;
    material?: string;
    [key: string]: unknown;
  };
}

export interface CreateOrderRequest {
  userId: string;
  shippingAddressId: string;
  orderItems: CreateOrderItem[];
  shippingMethod?: "standard" | "express" | "free_shipping";
  customerNotes?: string;
  paymentConfirmed: boolean;
  metadata?: Record<string, unknown>;
}

// Order calculation types
export interface OrderCalculation {
  subtotal: string;
  taxAmount: string;
  shippingAmount: string;
  totalAmount: string;
}

// Order update types
export interface UpdateOrderStatusRequest {
  orderId: string;
  newStatus: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded" | "returned";
  comment?: string;
  changedBy?: string;
  isCustomerVisible?: boolean;
}

export interface ConfirmPaymentRequest {
  orderId: string;
  comment?: string;
  changedBy?: string;
  isCustomerVisible?: boolean;
}

// Order filters for querying
export interface OrderFilters {
  userId?: string;
  status?: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded" | "returned";
  orderNumber?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: string;
  maxAmount?: string;
  shippingMethod?: "standard" | "express" | "free_shipping";
  sortBy?: "createdAt" | "updatedAt" | "totalAmount" | "orderNumber";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// Inventory validation types
export interface InventoryCheckResult {
  isValid: boolean;
  insufficientItems: {
    productId: string;
    productName: string;
    requestedQuantity: number;
    availableQuantity: number;
  }[];
}

// Order validation response
export interface OrderValidationResult {
  isValid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
  inventoryCheck?: InventoryCheckResult;
}
