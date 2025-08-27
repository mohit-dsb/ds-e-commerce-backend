import { z } from "zod";

const envSchema = z.object({
  // Application Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().min(1000).max(65535).default(3000),

  // Database Configuration
  DATABASE_URL: z.string().url("Database URL must be a valid URL"),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // CORS Configuration
  CORS_ORIGIN: z.string().default("*"),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),

  // Logging Configuration
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FORMAT: z.enum(["json", "pretty"]).default("json"),
});

// Parse and validate environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parseResult.error.issues);
  process.exit(1);
}

export const env = parseResult.data;
export type ENV = z.infer<typeof envSchema>;

// Environment-specific configurations
export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

// Validation helper for required production environment variables
if (isProduction) {
  const productionRequired = {
    DATABASE_URL: env.DATABASE_URL,
    JWT_SECRET: env.JWT_SECRET,
  };

  const missing = Object.entries(productionRequired)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(`❌ Missing required production environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("✅ Production environment validation passed");
}
