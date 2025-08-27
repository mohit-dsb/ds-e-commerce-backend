import { logger } from "@/utils/logger";
import { DatabaseError, createDatabaseError, AppError } from "@/utils/errors";
import type { ErrorContext, DatabaseErrorDetail } from "@/types/error.types";

export interface PostgresError extends Error {
  code?: string;
  detail?: string;
  table?: string;
  column?: string;
  constraint?: string;
  routine?: string;
}

export function isDatabaseError(error: any): error is PostgresError {
  return error && typeof error === "object" && "code" in error;
}

export function handleDatabaseError(error: Error | PostgresError, context: ErrorContext = {}): DatabaseError {
  if (!isDatabaseError(error)) {
    logger.databaseError("Unknown database error", error, context);
    return createDatabaseError("Database operation failed", { operation: "unknown" }, context, error);
  }

  const pgError = error;
  const details: DatabaseErrorDetail = {
    table: pgError.table,
    constraint: pgError.constraint,
    column: pgError.column,
  };

  let message = "Database operation failed";
  let userMessage = "A database error occurred";

  switch (pgError.code) {
    case "23505": // unique_violation
      message = "Unique constraint violation";

      // Provide more specific messages based on the constraint
      if (pgError.constraint) {
        if (
          pgError.constraint.includes("categories_name_unique") ||
          (pgError.table === "categories" && pgError.detail?.includes("name"))
        ) {
          userMessage = "A category with this name already exists";
        } else if (
          pgError.constraint.includes("categories_slug_unique") ||
          (pgError.table === "categories" && pgError.detail?.includes("slug"))
        ) {
          userMessage = "A category with this slug already exists";
        } else if (
          pgError.constraint.includes("users_email_unique") ||
          (pgError.table === "users" && pgError.detail?.includes("email"))
        ) {
          userMessage = "An account with this email already exists";
        } else {
          userMessage = "This record already exists";
        }
      } else {
        userMessage = "This record already exists";
      }

      details.operation = "insert/update";
      break;

    case "23503": // foreign_key_violation
      message = "Foreign key constraint violation";
      userMessage = "Referenced record does not exist";
      details.operation = "insert/update/delete";
      break;

    case "23502": // not_null_violation
      message = "Not null constraint violation";
      userMessage = "Required field is missing";
      details.operation = "insert/update";
      break;

    case "23514": // check_violation
      message = "Check constraint violation";
      userMessage = "Invalid data provided";
      details.operation = "insert/update";
      break;

    case "42P01": // undefined_table
      message = "Table does not exist";
      userMessage = "System error: Invalid table reference";
      details.operation = "select/insert/update/delete";
      break;

    case "42703": // undefined_column
      message = "Column does not exist";
      userMessage = "System error: Invalid column reference";
      details.operation = "select/insert/update/delete";
      break;

    case "08000": // connection_exception
    case "08003": // connection_does_not_exist
    case "08006": // connection_failure
      message = "Database connection error";
      userMessage = "Database is temporarily unavailable";
      details.operation = "connection";
      break;

    case "53300": // too_many_connections
      message = "Too many database connections";
      userMessage = "Service is temporarily overloaded";
      details.operation = "connection";
      break;

    case "40001": // serialization_failure
      message = "Transaction serialization failure";
      userMessage = "Please retry your request";
      details.operation = "transaction";
      break;

    case "40P01": // deadlock_detected
      message = "Database deadlock detected";
      userMessage = "Please retry your request";
      details.operation = "transaction";
      break;

    default:
      message = `Database error: ${pgError.code}`;
      userMessage = "A database error occurred";
      details.operation = "unknown";
      break;
  }

  // Log the detailed error for debugging
  logger.databaseError(message, pgError, {
    ...context,
    metadata: {
      pgCode: pgError.code,
      pgDetail: pgError.detail,
      pgTable: pgError.table,
      pgColumn: pgError.column,
      pgConstraint: pgError.constraint,
    },
  });

  return createDatabaseError(userMessage, details, context, pgError);
}

// Wrapper for database operations that handles errors consistently
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // If it's already an AppError (like ConflictError, NotFoundError, etc.),
    // let it pass through unchanged to avoid double-wrapping
    if (error instanceof AppError) {
      throw error;
    }

    // Only handle actual database errors
    throw handleDatabaseError(error as Error, context);
  }
}

// Specific handlers for common database operations
export const dbErrorHandlers = {
  async create<T>(operation: () => Promise<T>, resource: string, context: ErrorContext = {}): Promise<T> {
    return withDatabaseErrorHandling(operation, {
      ...context,
      metadata: { operation: "create", resource },
    });
  },

  async read<T>(operation: () => Promise<T>, resource: string, context: ErrorContext = {}): Promise<T> {
    return withDatabaseErrorHandling(operation, {
      ...context,
      metadata: { operation: "read", resource },
    });
  },

  async update<T>(operation: () => Promise<T>, resource: string, context: ErrorContext = {}): Promise<T> {
    return withDatabaseErrorHandling(operation, {
      ...context,
      metadata: { operation: "update", resource },
    });
  },

  async delete<T>(operation: () => Promise<T>, resource: string, context: ErrorContext = {}): Promise<T> {
    return withDatabaseErrorHandling(operation, {
      ...context,
      metadata: { operation: "delete", resource },
    });
  },
};
