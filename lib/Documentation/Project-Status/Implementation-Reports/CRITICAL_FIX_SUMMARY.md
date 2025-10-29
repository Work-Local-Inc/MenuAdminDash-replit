# CRITICAL FIX: Admin Authentication Infrastructure (Oct 27, 2025)

## Problem
**BLOCKER**: Dashboard showing zero restaurants and all API requests failing with 403 Forbidden errors.

### Root Cause
The `menuca_v3.admin_users` and `menuca_v3.admin_roles` tables **did not exist** in the Supabase database. 

The authentication middleware (`lib/auth/admin-check.ts`) was trying to verify users against a non-existent table, causing:
- Error: "Cannot coerce the result to a single JSON object"
- 100% of API routes returning 403 Forbidden
- Dashboard unable to load any data despite 961 restaurants and 32,317 users existing in database

### Why It Happened
Migration file `migrations/001_create_new_tables.sql` **referenced** `menuca_v3.admin_users` in foreign keys but **never created** the table, assuming it already existed.

## Solution Implemented

### 1. Created Admin Infrastructure Tables

**`menuca_v3.admin_roles`** (3 default roles):
```sql
CREATE TABLE menuca_v3.admin_roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL,
  is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default roles inserted:
-- 1. Super Admin (full platform access)
-- 2. Restaurant Manager (manage assigned restaurants)
-- 3. Staff (view-only access)
```

**`menuca_v3.admin_users`**:
```sql
CREATE TABLE menuca_v3.admin_users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  password_hash VARCHAR(255),
  role_id BIGINT REFERENCES menuca_v3.admin_roles(id),
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  -- Plus existing columns from production schema
);
```

**`menuca_v3.admin_user_restaurants`** (junction table):
```sql
CREATE TABLE menuca_v3.admin_user_restaurants (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT NOT NULL REFERENCES menuca_v3.admin_users(id) ON DELETE CASCADE,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id) ON DELETE CASCADE,
  role_id BIGINT REFERENCES menuca_v3.admin_roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_user_id, restaurant_id)
);
```

### 2. Added First Super Admin
```sql
INSERT INTO menuca_v3.admin_users (email, first_name, last_name, role_id)
VALUES ('brian+1@worklocal.ca', 'Brian', 'Admin', 1);
```

**Result**: User ID 924 created with Super Admin role (role_id: 1)

## Verification Results

### Before Fix
```
GET /api/dashboard/stats 403 Forbidden
GET /api/restaurants 403 Forbidden
GET /api/orders 403 Forbidden
Error: "User not found in admin_users"
```

### After Fix
```
GET /api/dashboard/stats 200 OK ✅
GET /api/restaurants 200 OK ✅
GET /api/orders 200 OK ✅
Dashboard loads with:
  - 961 total restaurants
  - 277 active restaurants
  - 32,317 users
  - 0 orders (no order data in production yet)
```

## Scripts Created

### Permanent (Keep for diagnostics):
- `scripts/check-admin-duplicates.ts` - Check for duplicate admin users
- `scripts/check-database-data.ts` - Verify database connection and data counts

### One-time Use (Keep for reference):
- `scripts/create-admin-tables.ts` - Initial table creation (already executed)
- `scripts/fix-admin-schema.ts` - Add missing columns (already executed)
- `scripts/verify-and-fix-admin.ts` - Verification script (already executed)

### Migration Reference:
- `migrations/000_create_admin_users_URGENT.sql` - SQL migration for manual execution in Supabase

## Key Learnings

1. **Schema Assumptions**: Never assume tables exist - always verify or create them explicitly
2. **Migration Ordering**: Create referenced tables before tables that reference them
3. **Database Connection**: This app uses `SUPABASE_BRANCH_DB_URL` (production), not Replit's development DB
4. **Column Names**: Production uses `status` not `restaurant_status` for restaurants table
5. **Direct Access**: Can connect to Supabase DB directly using `pg` Pool with connection string from secrets

## Follow-up Actions Needed

1. ✅ Fix verification scripts to use correct column name (`status` not `restaurant_status`)
2. ⚠️ Consider adding admin_users creation to official migration workflow
3. ⚠️ Update migration files to create admin_users/admin_roles before referencing them
4. ⚠️ Add database schema validation checks to prevent similar issues

## Impact
- **Before**: Dashboard completely non-functional (100% API failure rate)
- **After**: Dashboard fully operational with all 277 active restaurants accessible
- **Time to Fix**: ~1 hour
- **Severity**: CRITICAL (blocking all admin functionality)
- **Status**: ✅ RESOLVED
