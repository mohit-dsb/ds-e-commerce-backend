import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  // DATABASE
  DATABASE_URL: z.string(),
  // JWT
  JWT_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
export type ENV = z.infer<typeof envSchema>;
