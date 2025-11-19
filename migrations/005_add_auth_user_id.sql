-- ============================================
-- Add auth_user_id to users table
-- Links Supabase Auth UUID to integer user IDs
-- ============================================

-- Add column to store Supabase Auth user ID
ALTER TABLE menuca_v3.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON menuca_v3.users(auth_user_id);

-- Verification
SELECT 'Successfully added auth_user_id column to users table' AS status;
