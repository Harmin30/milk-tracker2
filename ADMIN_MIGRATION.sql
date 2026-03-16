-- Step 1: Add is_admin column to users table (defaults to false)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Step 2: Add is_active column to users table (defaults to true, for blocking users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Step 3: Once you have run the above, set an admin user by running this query:
-- UPDATE users SET is_admin = TRUE WHERE email = 'your-admin-email@example.com';
-- 
-- Examples:
-- UPDATE users SET is_admin = TRUE WHERE email = 'admin@example.com';
--
-- Step 4: (Optional) To deactivate a user:
-- UPDATE users SET is_active = FALSE WHERE email = 'user@example.com';
