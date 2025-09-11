ALTER TABLE "order_items" DROP COLUMN "is_digital";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "requires_shipping";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "tracking_number";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "allow_backorder";