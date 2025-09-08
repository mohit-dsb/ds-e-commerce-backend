ALTER TABLE "products" ADD COLUMN "rating" numeric(3, 2) DEFAULT '0.00' NOT NULL;
ALTER TABLE "products" ADD CONSTRAINT "rating_range" CHECK ("rating" >= 0 AND "rating" <= 5);