import { db } from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { env } from "../config/env";
import { eq, and, gt } from "drizzle-orm";
import { BCRYPT_ROUNDS, JWT_EXPIRES_IN } from "../utils/constants";
import { users, sessions, passwordResets, type User } from "../db/schema";

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, env.JWT_SECRET) as { userId: string };
    } catch {
      return null;
    }
  }

  static async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    const hashedPassword = await this.hashPassword(data.password);

    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
      })
      .returning();

    return user;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  static async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  static async createSession(userId: string): Promise<string> {
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(sessions).values({
      userId,
      token,
      expiresAt,
    });

    return token;
  }

  static async validateSession(token: string): Promise<User | null> {
    const [session] = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));

    return session?.user || null;
  }

  static async revokeSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  static async createPasswordResetToken(userId: string): Promise<string> {
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResets).values({
      userId,
      token,
      expiresAt,
    });

    return token;
  }

  static async validatePasswordResetToken(token: string): Promise<string | null> {
    const [reset] = await db
      .select()
      .from(passwordResets)
      .where(
        and(eq(passwordResets.token, token), eq(passwordResets.used, false), gt(passwordResets.expiresAt, new Date()))
      );

    return reset?.userId || null;
  }

  static async usePasswordResetToken(token: string): Promise<void> {
    await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.token, token));
  }

  static async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword);
    await db.update(users).set({ password: hashedPassword, updatedAt: new Date() }).where(eq(users.id, userId));
  }
}
