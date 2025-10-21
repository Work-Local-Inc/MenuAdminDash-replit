# 🗄️ DATABASE EXTENSIONS (TASK 1) - CRITICAL

## ⚠️ IMPORTANT: This Migration is Required

This migration adds **11 new tables** and updates **3 existing tables** to support critical features:

✅ **Role-Based Access Control (RBAC)**  
✅ **Franchise/Chain Management**  
✅ **Security (Blacklist)**  
✅ **Order Cancellations**  
✅ **Email Templates**  
✅ **Accounting & Statements**  
✅ **SEO Features**

**Status**: ⏳ Pending execution  
**Blocks**: Tasks 2, 5, 6, 7, 8 (HIGH PRIORITY features)  
**Estimated Time**: ~30 seconds to execute

---

## 📋 What This Migration Creates

### New Tables (11 total)

1. **`admin_roles`** - RBAC role definitions with permissions matrix
   - 3 default roles: Super Admin, Restaurant Manager, Staff
   - JSON permissions: `{"restaurants": {"create": true, "edit": true}}`

2. **`blacklist`** - Block fraudulent users/devices
   - Supports: email, phone, IP, device_id
   - Temporary (expires_at) or permanent bans

3. **`franchises`** - Franchise/chain organizations
   - Links multiple restaurants under one parent company

4. **`franchise_commission_rules`** - Commission calculation
   - Types: percentage, fixed_per_order, tiered
   - Time-based rules (effective_from, effective_until)

5. **`order_cancellation_requests`** - Customer cancellation workflow
   - Admin approval process
   - Refund tracking (amount, status, transaction_id)

6. **`email_templates`** - Customizable email templates
   - Variable substitution: `{{customerName}}`, `{{orderTotal}}`
   - Templates: order_confirmation, password_reset, etc.

7. **`restaurant_citations`** - SEO/local listings tracking
   - Platforms: Google My Business, Yelp, TripAdvisor
   - Verification status tracking

8. **`restaurant_banners`** - Promotional banners
   - Display on: menu_page, checkout, homepage
   - Schedule with start_date/end_date

9. **`restaurant_bank_accounts`** - Payout bank accounts
   - Encrypted account numbers
   - Support for Canadian format (institution, transit, account)

10. **`restaurant_redirects`** - SEO 301/302 redirects
    - Track old → new URL paths
    - Hit count analytics

11. **`restaurant_charges`** - Fees & adjustments
    - Types: setup_fee, monthly_fee, commission, marketing, penalties
    - Status: pending, invoiced, paid, waived

### Updated Tables (3 total)

1. **`restaurants`** - Added `franchise_id` column
   - Links restaurant to parent franchise (NULL = independent)

2. **`admin_user_restaurants`** - Added `role_id` column
   - Assigns role to admin user for specific restaurant

3. **`promotional_coupons`** - Added 5 new columns
   - `email_exclusive` - Email-only coupons
   - `include_in_emails` - Include in email campaigns
   - `single_use` - One-time use per customer
   - `applies_to_courses` - JSON array of course IDs
   - `min_order_amount` - Minimum order in cents

---

## 🚀 How to Run This Migration

### Option 1: Supabase SQL Editor (RECOMMENDED)

1. **Open Supabase Dashboard**
   - URL: https://nthpbtdjhhnwfxqsxbvy.supabase.co
   - Navigate to: **SQL Editor**

2. **Create New Query**
   - Click **New Query** button

3. **Copy Migration SQL**
   - Open file: `db/migrations/task_1_database_extensions.sql`
   - Copy the entire contents (Ctrl+A, Ctrl+C)

4. **Paste and Run**
   - Paste into SQL Editor
   - Click **Run** button
   - Wait ~30 seconds for completion

5. **Verify Success**
   - Look for: "Success. No rows returned"
   - Run verification query (included at bottom of migration file)

### Option 2: Command Line (psql)

```bash
# Connect to Supabase database
psql "postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres"

# Run migration
\i db/migrations/task_1_database_extensions.sql

# Verify
\dt menuca_v3.admin_roles
\dt menuca_v3.blacklist
\dt menuca_v3.franchises
```

---

## ✅ Verification Steps

After running the migration, verify everything was created:

### 1. Check Tables Exist

```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'menuca_v3' 
   AND information_schema.columns.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'menuca_v3' 
  AND table_name IN (
    'admin_roles', 
    'blacklist', 
    'franchises', 
    'franchise_commission_rules',
    'order_cancellation_requests',
    'email_templates',
    'restaurant_citations',
    'restaurant_banners',
    'restaurant_bank_accounts',
    'restaurant_redirects',
    'restaurant_charges'
  )
ORDER BY table_name;
```

**Expected**: 11 rows (one for each new table)

### 2. Check Default Roles

```sql
SELECT id, name, is_system_role, permissions 
FROM admin_roles 
ORDER BY id;
```

**Expected**: 3 rows
- Super Admin (full access)
- Restaurant Manager (restaurant-level access)
- Staff (read-only access)

### 3. Check New Columns

```sql
-- Check restaurants.franchise_id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'menuca_v3' 
  AND table_name = 'restaurants' 
  AND column_name = 'franchise_id';

-- Check admin_user_restaurants.role_id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'menuca_v3' 
  AND table_name = 'admin_user_restaurants' 
  AND column_name = 'role_id';

-- Check promotional_coupons new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'menuca_v3' 
  AND table_name = 'promotional_coupons' 
  AND column_name IN ('email_exclusive', 'include_in_emails', 'single_use', 'applies_to_courses', 'min_order_amount');
```

**Expected**: All columns should exist

---

## 🔄 Next Steps After Migration

### 1. Update TypeScript Types

After running the migration, regenerate TypeScript types from Supabase:

**Option A: Supabase Dashboard**
1. Go to: https://nthpbtdjhhnwfxqsxbvy.supabase.co/project/_/settings/api
2. Scroll to "TypeScript Types"
3. Click "Generate Types" button
4. Copy generated types
5. Replace contents of `types/supabase-database.ts`

**Option B: Supabase CLI** (if installed)
```bash
npx supabase gen types typescript --project-id nthpbtdjhhnwfxqsxbvy > types/supabase-database.ts
```

### 2. Test Database Connection

Run verification script:
```bash
cd scripts
node test-supabase-connection.ts
```

### 3. Begin Feature Development

After migration is complete, you can proceed with:
- ✅ **TASK 2**: RBAC System (uses `admin_roles`)
- ✅ **TASK 5**: Coupons Management (uses updated `promotional_coupons`)
- ✅ **TASK 6**: Franchise Management (uses `franchises`, `franchise_commission_rules`)
- ✅ **TASK 7**: Accounting (uses `restaurant_bank_accounts`, `restaurant_charges`)
- ✅ **TASK 8**: Blacklist Management (uses `blacklist`)

---

## 🐛 Troubleshooting

### Error: "relation already exists"

**Cause**: Table already created  
**Solution**: Migration uses `IF NOT EXISTS` - this is safe to ignore

### Error: "column already exists"

**Cause**: Column already added  
**Solution**: Migration uses `ADD COLUMN IF NOT EXISTS` - this is safe to ignore

### Error: "permission denied"

**Cause**: Not using service role key  
**Solution**: Make sure you're logged into Supabase with admin privileges

### Error: "foreign key violation"

**Cause**: Referenced table doesn't exist  
**Solution**: Ensure you're using the `menuca_v3` schema. Check existing tables:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'menuca_v3' 
ORDER BY table_name;
```

---

## 📊 Impact Summary

**Tables Created**: 11  
**Tables Updated**: 3  
**Indexes Created**: 25+  
**Default Data Inserted**: 3 admin roles  
**Foreign Keys**: 15+  
**Blocking Tasks**: 5 high-priority features  
**Execution Time**: ~30 seconds  
**Rollback Complexity**: Medium (use transaction BEGIN/COMMIT)

---

## 🔒 Security Notes

- **Encrypted Data**: `restaurant_bank_accounts.account_number_encrypted` requires application-level encryption
- **Sensitive Fields**: Bank accounts, blacklist reasons contain PII
- **RBAC**: Permissions matrix in `admin_roles.permissions` controls all access
- **Row-Level Security (RLS)**: Consider enabling RLS policies for sensitive tables

---

## 📝 Migration Checklist

Before marking TASK 1 as complete:

- [ ] SQL migration executed successfully in Supabase
- [ ] Verification queries return expected results (11 tables, 3 roles)
- [ ] TypeScript types regenerated from Supabase schema
- [ ] No errors in application logs
- [ ] `types/supabase-database.ts` includes new tables
- [ ] Database connection test passes
- [ ] Documented in NEXT_STEPS_TASK_LIST.md as complete

---

**Created**: October 21, 2025  
**Author**: Replit Agent  
**Priority**: CRITICAL  
**Dependencies**: None (this is the foundation)
