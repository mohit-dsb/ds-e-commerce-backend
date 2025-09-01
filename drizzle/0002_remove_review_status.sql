-- Remove review status functionality
-- Drop the status column from product_reviews table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_reviews' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE "product_reviews" DROP COLUMN "status";
    END IF;
END $$;

-- Drop the review_status enum type if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'review_status'
    ) THEN
        DROP TYPE "review_status";
    END IF;
END $$;
