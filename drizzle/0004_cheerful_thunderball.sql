DROP TABLE "product_options" CASCADE;--> statement-breakpoint
DROP TABLE "product_variants" CASCADE;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "compare_at_price";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "requires_shipping";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "taxable";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "inventory_tracking";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "low_stock_threshold";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "meta_title";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "meta_description";--> statement-breakpoint
DROP TYPE "public"."inventory_tracking";