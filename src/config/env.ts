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

  // Logging Configuration
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FORMAT: z.enum(["json", "pretty"]).default("json"),

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),

  // Email Configuration
  EMAIL_USER: z.string().email("Email user must be a valid email"),
  EMAIL_PASS: z.string().min(1, "Email password is required"),
  EMAIL_FROM: z.string().email("From email must be a valid email"),
  EMAIL_FROM_NAME: z.string().default("DS E-commerce"),

  // Frontend URL for reset links
  FRONTEND_URL: z.string().url("Frontend URL must be a valid URL").default("http://localhost:3000"),
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
    EMAIL_USER: env.EMAIL_USER,
    EMAIL_PASS: env.EMAIL_PASS,
    EMAIL_FROM: env.EMAIL_FROM,
    FRONTEND_URL: env.FRONTEND_URL,
  };

  // Check Cloudinary configuration in production
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    // Cloudinary is configured
  } else {
    // Cloudinary configuration not found - image upload will be disabled
  }

  const missing = Object.entries(productionRequired)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(`❌ Missing required production environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}
