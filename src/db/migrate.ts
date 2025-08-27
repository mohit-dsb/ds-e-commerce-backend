import { db } from "./index";
import { logger } from "../utils/logger";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function runMigration() {
  logger.info("Running database migrations...");

  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    logger.info("Database migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    logger.error("Database migration failed", error as Error, {
      metadata: { migrationsFolder: "drizzle" },
    });
    process.exit(1);
  }
}

runMigration().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
