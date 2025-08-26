import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { AuthService } from "../services/auth.service";
import { authMiddleware, type AuthContext } from "../middleware/auth.middleware";
import { registerSchema, loginSchema, resetPasswordSchema } from "../db/schema";

const auth = new Hono<{ Variables: AuthContext }>();

// Register new user
auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const { email, password, firstName, lastName } = c.req.valid("json");

  const existingUser = await AuthService.getUserByEmail(email);
  if (existingUser) {
    throw new HTTPException(409, { message: "User already exists" });
  }

  const user = await AuthService.createUser({
    email,
    password,
    firstName,
    lastName,
  });

  const token = await AuthService.createSession(user.id);

  return c.json(
    {
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
      },
      token,
    },
    201
  );
});

// Login user
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const user = await AuthService.getUserByEmail(email);
  if (!user) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  const isValidPassword = await AuthService.verifyPassword(password, user.password);
  if (!isValidPassword) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  const token = await AuthService.createSession(user.id);

  return c.json({
    message: "Login successful",
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
    },
    token,
  });
});

// Get current user profile
auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});

// Logout user
auth.post("/logout", authMiddleware, async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader!.substring(7);

  await AuthService.revokeSession(token);

  return c.json({ message: "Logout successful" });
});

// Request password reset
auth.post("/forgot-password", zValidator("json", loginSchema.pick({ email: true })), async (c) => {
  const { email } = c.req.valid("json");

  const user = await AuthService.getUserByEmail(email);
  if (!user) {
    // Don't reveal if user exists or not
    return c.json({ message: "If the email exists, a reset link has been sent" });
  }

  const resetToken = await AuthService.createPasswordResetToken(user.id);

  // In production, send email with reset link
  console.log(`Password reset token for ${email}: ${resetToken}`);

  return c.json({ message: "If the email exists, a reset link has been sent" });
});

// Reset password
auth.post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  const { token, password } = c.req.valid("json");

  const userId = await AuthService.validatePasswordResetToken(token);
  if (!userId) {
    throw new HTTPException(400, { message: "Invalid or expired reset token" });
  }

  await AuthService.updatePassword(userId, password);
  await AuthService.usePasswordResetToken(token);

  return c.json({ message: "Password reset successful" });
});

export default auth;
