ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_revoked_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP COLUMN "is_revoked";--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP COLUMN "revoked_at";--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP COLUMN "revoked_by";--> statement-breakpoint
ALTER TABLE "shipping_addresses" DROP COLUMN "company";