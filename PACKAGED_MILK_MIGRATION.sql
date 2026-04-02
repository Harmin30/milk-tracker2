-- Add columns for packaged milk support to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_milk_name VARCHAR(100) DEFAULT 'Packaged Milk';
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_brand_price DECIMAL(10, 2);
