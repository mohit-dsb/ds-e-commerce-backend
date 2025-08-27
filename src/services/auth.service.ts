import { db } from "@/db";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { logger } from "@/utils/logger";
import { eq, and, gt, type InferSelectModel } from "drizzle-orm";
import { BCRYPT_ROUNDS } from "@/utils/constants";
import { HonoJWTService } from "@/utils/hono-jwt";
import { createNotFoundError } from "@/utils/errors";
import type { ErrorContext } from "@/types/error.types";
import { dbErrorHandlers } from "@/utils/database-errors";
import { users, sessions, passwordResets } from "@/db/schema";

type User = InferSelectModel<typeof users>;

export class AuthService {
  static async hashPassword(password: string, context: ErrorContext = {}): Promise<string> {
    try {
      return await bcrypt.hash(password, BCRYPT_ROUNDS);
    } catch (error) {
      logger.error("Password hashing failed", error as Error, context);
      throw new Error("Failed to process password");
    }
  }

  static async verifyPassword(password: string, hashedPassword: string, context: ErrorContext = {}): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error("Password verification failed", error as Error, context);
      return false;
    }
  }

  static async generateToken(userId: string, context: ErrorContext = {}): Promise<string> {
    return await HonoJWTService.generateToken(userId, {}, context);
  }

  static async verifyToken(token: string, context: ErrorContext = {}): Promise<{ userId: string } | null> {
    const payload = await HonoJWTService.verifyToken(token, context);
    return payload ? { userId: payload.userId } : null;
  }

  static async createUser(
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    },
    context: ErrorContext = {}
  ): Promise<User> {
    return dbErrorHandlers.create(
      async () => {
        const hashedPassword = await this.hashPassword(data.password, context);

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
          logger.error("Failed to create user - no user returned", undefined, context);
          throw new Error("Failed to create user account");
        }

        logger.info("User created successfully", {
          ...context,
          metadata: { userId: user.id, email: data.email },
        });

        return user;
      },
      "user",
      context
    );
  }

  static async getUserByEmail(email: string, context: ErrorContext = {}): Promise<User | null> {
    return dbErrorHandlers.read(
      async () => {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user || null;
      },
      "user",
      context
    );
  }

  static async getUserById(id: string, context: ErrorContext = {}): Promise<User | null> {
    return dbErrorHandlers.read(
      async () => {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || null;
      },
      "user",
      context
    );
  }

  static async createSession(userId: string, context: ErrorContext = {}): Promise<string> {
    return dbErrorHandlers.create(
      async () => {
        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await db.insert(sessions).values({
          userId,
          token,
          expiresAt,
        });

        logger.info("Session created", {
          ...context,
          metadata: { userId, expiresAt: expiresAt.toISOString() },
        });

        return token;
      },
      "session",
      context
    );
  }

  static async validateSession(token: string, context: ErrorContext = {}): Promise<User | null> {
    return dbErrorHandlers.read(
      async () => {
        const [session] = await db
          .select({ user: users })
          .from(sessions)
          .innerJoin(users, eq(sessions.userId, users.id))
          .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));

        if (!session) {
          logger.warn("Invalid or expired session token", {
            metadata: { hasToken: !!token },
          });
          return null;
        }

        return session.user;
      },
      "session",
      context
    );
  }

  static async revokeSession(token: string, context: ErrorContext = {}): Promise<void> {
    await dbErrorHandlers.delete(
      async () => {
        await db.delete(sessions).where(eq(sessions.token, token));

        logger.info("Session revoked", {
          ...context,
          metadata: { tokenProvided: !!token },
        });
      },
      "session",
      context
    );
  }

  static async createPasswordResetToken(userId: string, context: ErrorContext = {}): Promise<string> {
    return dbErrorHandlers.create(
      async () => {
        // Check if user exists
        const user = await this.getUserById(userId, context);
        if (!user) {
          throw createNotFoundError("User", context);
        }

        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.insert(passwordResets).values({
          userId,
          token,
          expiresAt,
        });

        logger.info("Password reset token created", {
          ...context,
          metadata: { userId, expiresAt: expiresAt.toISOString() },
        });

        return token;
      },
      "passwordReset",
      context
    );
  }

  static async validatePasswordResetToken(token: string, context: ErrorContext = {}): Promise<string | null> {
    return dbErrorHandlers.read(
      async () => {
        const [reset] = await db
          .select()
          .from(passwordResets)
          .where(
            and(
              eq(passwordResets.token, token),
              eq(passwordResets.used, false),
              gt(passwordResets.expiresAt, new Date())
            )
          );

        if (!reset) {
          logger.warn("Invalid or expired password reset token", {
            ...context,
            metadata: { hasToken: !!token },
          });
          return null;
        }

        return reset.userId;
      },
      "passwordReset",
      context
    );
  }

  static async usePasswordResetToken(token: string, context: ErrorContext = {}): Promise<void> {
    await dbErrorHandlers.update(
      async () => {
        await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.token, token));

        logger.info("Password reset token used", {
          ...context,
          metadata: { tokenProvided: !!token },
        });
      },
      "passwordReset",
      context
    );
  }

  static async updatePassword(userId: string, newPassword: string, context: ErrorContext = {}): Promise<void> {
    await dbErrorHandlers.update(
      async () => {
        // Verify user exists
        const user = await this.getUserById(userId, context);
        if (!user) {
          throw createNotFoundError("User", context);
        }

        const hashedPassword = await this.hashPassword(newPassword, context);
        await db
          .update(users)
          .set({
            password: hashedPassword,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        logger.info("User password updated", {
          ...context,
          metadata: { userId },
        });
      },
      "user",
      context
    );
  }
}
