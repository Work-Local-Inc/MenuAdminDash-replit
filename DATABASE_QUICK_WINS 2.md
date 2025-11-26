# 🚀 Database Quick Wins - Performance & Security

## 🚨 CRITICAL: Your New Tables Need RLS!

**SECURITY ISSUE:** The tables we just created don't have Row Level Security enabled!

```sql
-- Fix immediately (run in Supabase SQL Editor):
ALTER TABLE menuca_v3.course_modifier_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE menuca_v3.course_template_modifiers ENABLE ROW LEVEL SECURITY;

-- Add policies (so they're usable):
CREATE POLICY "Public can read category modifier groups" 
ON menuca_v3.course_modifier_templates 
FOR SELECT TO anon, authenticated 
USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage category modifier groups"
ON menuca_v3.course_modifier_templates
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM menuca_v3.admin_user_restaurants aur
    INNER JOIN menuca_v3.courses c ON c.id = course_modifier_templates.course_id
    WHERE aur.restaurant_id = c.restaurant_id
    AND aur.admin_user_id = auth.uid()
  )
);

-- Same for course_template_modifiers
CREATE POLICY "Public can read modifier options"
ON menuca_v3.course_template_modifiers
FOR SELECT TO anon, authenticated
USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage modifier options"
ON menuca_v3.course_template_modifiers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM menuca_v3.course_modifier_templates cmt
    INNER JOIN menuca_v3.courses c ON c.id = cmt.course_id
    INNER JOIN menuca_v3.admin_user_restaurants aur ON aur.restaurant_id = c.restaurant_id
    WHERE cmt.id = course_template_modifiers.template_id
    AND aur.admin_user_id = auth.uid()
  )
);
```

---

## ⚡ Performance Quick Wins (Easy Fixes)

### 1. **Fix Slow RLS Policies** (Big Performance Boost!)

**Problem:** Auth functions (`auth.uid()`) are re-evaluated for EVERY row

**Fix:** Wrap with `SELECT`:

```sql
-- SLOW (current):
WHERE user_id = auth.uid()

-- FAST (fixed):
WHERE user_id = (SELECT auth.uid())
```

**Impact:** 43+ tables affected! This could 10x query speed on those tables.

**Tables to fix:**
- `users`, `user_addresses`, `user_delivery_addresses`
- `orders`, `order_items`, `order_status_history`
- `admin_users`, `admin_user_restaurants`
- `restaurants`, `courses`, `dishes`
- `modifier_groups`, `dish_modifiers`
- ... and 30+ more

---

### 2. **Add Missing Foreign Key Indexes** (Faster Joins!)

**Problem:** 27+ foreign keys without indexes → slow joins

**Top priorities:**
```sql
-- Orders (high traffic!)
CREATE INDEX idx_orders_cancelled_by ON menuca_v3.orders(cancelled_by);
CREATE INDEX idx_orders_delivery_city ON menuca_v3.orders(delivery_city_id);

-- Admin users
CREATE INDEX idx_admin_users_role ON menuca_v3.admin_users(role_id);
CREATE INDEX idx_admin_users_deleted_by ON menuca_v3.admin_users(deleted_by);

-- Cart sessions (customer facing!)
CREATE INDEX idx_cart_sessions_restaurant ON menuca_v3.cart_sessions(restaurant_id);

-- User addresses
CREATE INDEX idx_user_delivery_addresses_city ON menuca_v3.user_delivery_addresses(city_id);
```

---

### 3. **Remove Duplicate Indexes** (Free Up Space!)

**Problem:** Multiple identical indexes → wasting space and slowing writes

```sql
-- Drop duplicates:
DROP INDEX menuca_v3.idx_admin_restaurants_admin;  -- Keep idx_admin_user_restaurants_admin
DROP INDEX menuca_v3.idx_cgmp_combo;  -- Keep idx_combo_mod_pricing_group
DROP INDEX menuca_v3.idx_courses_order;  -- Keep idx_courses_restaurant_display
DROP INDEX menuca_v3.idx_dish_modifiers_order;  -- Keep idx_dish_modifiers_group_id_active

-- Orders partitions (6 duplicate indexes!):
DROP INDEX menuca_v3.orders_2025_10_user_id_created_at_idx1;
DROP INDEX menuca_v3.orders_2025_11_user_id_created_at_idx1;
DROP INDEX menuca_v3.orders_2025_12_user_id_created_at_idx1;
DROP INDEX menuca_v3.orders_2026_01_user_id_created_at_idx1;
DROP INDEX menuca_v3.orders_2026_02_user_id_created_at_idx1;
DROP INDEX menuca_v3.orders_2026_03_user_id_created_at_idx1;
```

---

### 4. **Simplify Multiple Permissive Policies** (Cleaner & Faster!)

**Problem:** Tables have multiple SELECT policies for same role → all evaluated every query

**Examples:**
- `courses`: 3-4 policies for `authenticated` role
- `dishes`: 3-4 policies for `authenticated` role
- `dish_modifiers`: 3 policies for `authenticated` role

**Fix:** Combine into single policy per role/action:

```sql
-- Instead of 3 separate policies, combine:
DROP POLICY "Enable public read access" ON menuca_v3.courses;
DROP POLICY "courses_public_read" ON menuca_v3.courses;
DROP POLICY "public_view_active_courses" ON menuca_v3.courses;

-- Create one:
CREATE POLICY "public_read_active_courses" 
ON menuca_v3.courses 
FOR SELECT 
TO anon, authenticated
USING (deleted_at IS NULL);
```

---

## 📊 Impact Summary

### Immediate (5 minutes):
✅ Enable RLS on new tables → **Fix security vulnerability**
✅ Add foreign key indexes → **20-50% faster joins**

### Short term (30 minutes):
✅ Fix RLS auth functions → **5-10x faster on affected queries**
✅ Drop duplicate indexes → **Save disk space, faster writes**

### Long term (2 hours):
✅ Consolidate permissive policies → **Simpler, faster**
✅ Remove unused indexes → **More space savings**

---

## 🎯 Recommended Priority:

### Priority 1: Security (Do NOW!)
- ✅ Enable RLS on `course_modifier_templates`
- ✅ Enable RLS on `course_template_modifiers`
- ✅ Enable RLS on orders partitions (2025_12, 2026_01, 2026_02, 2026_03)

### Priority 2: Performance (High Impact)
- ✅ Fix auth RLS functions (wrap with SELECT)
- ✅ Add missing FK indexes on `orders` table
- ✅ Add missing FK index on `cart_sessions.restaurant_id`

### Priority 3: Cleanup (Low Effort)
- ✅ Drop duplicate indexes
- ✅ Remove unused indexes

---

## 📋 Full Supabase Advisor Report

**Performance Issues:**
- 27 unindexed foreign keys
- 43+ slow RLS policies (auth functions not wrapped)
- 19 duplicate indexes
- 100+ unused indexes
- 19 tables with multiple permissive policies

**Security Issues:**
- 🚨 27 tables missing RLS (including your NEW ones!)
- 20 SECURITY DEFINER views
- 77 functions without search_path

**Link to full report:**
[Supabase Performance Advisor](https://supabase.com/docs/guides/database/database-linter)

---

## Want Me To Fix These?

I can create SQL migrations to fix:
1. ✅ RLS on new tables (5 min - CRITICAL!)
2. ✅ Missing FK indexes (15 min)
3. ✅ Duplicate indexes (5 min)

Let me know which you want to prioritize!

