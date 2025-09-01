-- Check if constraint already exists and only add if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_non_negative' 
        AND table_name = 'products'
    ) THEN
        -- Update any negative inventory quantities to 0 before adding constraint
        UPDATE "products" SET "inventory_quantity" = 0 WHERE "inventory_quantity" < 0 AND "allow_backorder" = false;
        
        -- Add the inventory constraint
        ALTER TABLE "products" ADD CONSTRAINT "inventory_non_negative" CHECK ("products"."inventory_quantity" >= 0 OR "products"."allow_backorder" = true);
    END IF;
END $$;