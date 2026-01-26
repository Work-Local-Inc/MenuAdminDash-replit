# Admin Entity Audit Report

**Date:** January 2026  
**Purpose:** Compare dev's admin entity handoff against current codebase implementation

---

## Executive Summary

The dev simplified the admin system to 2 roles (Super Admin, Restaurant Admin) and created optimized SQL/RPC functions, but our codebase still references the old 6-role structure and doesn't utilize the new database functions.

**Priority:** Medium-High - The code works but is inconsistent with the simplified database schema.

---

## Gap Analysis

### 1. Role ID Mismatch (HIGH PRIORITY)

**Database (per handoff):**
| ID | Name | Description |
|----|------|-------------|
| 1 | Super Admin | Full platform access |
| 2 | Restaurant Admin | Full menu management for assigned restaurants |

**Codebase references:**
| File | References |
|------|------------|
| `app/api/admin-users/create/route.ts` | Uses `role_id: 5` for Restaurant Manager |
| `app/admin/users/admin-users/page.tsx` | UI shows role 5 (Restaurant Manager), role 6 (Staff) |
| `app/admin/users/admin-users/create/page.tsx` | References Restaurant Manager (5) and Staff (6) |
| `lib/hooks/use-admin-roles.ts` | Documents 6-role hierarchy |
| `lib/rbac.ts` | Has `isRestaurantManager()`, `isStaff()` functions checking wrong role names |

**Impact:** New admins created via the UI will get role_id = 5, but the database only has role 1 and 2 defined. This could cause FK constraint violations or orphaned role references.

**Recommended Fix:**
- Update `create/route.ts` to use `role_id: 2` for Restaurant Admin
- Update admin UI dropdowns to show only roles 1 and 2
- Update `lib/rbac.ts` to use `Restaurant Admin` instead of `Restaurant Manager`
- Remove `Staff` role references

---

### 2. SQL Functions Not Utilized (MEDIUM PRIORITY)

**Available (per handoff):**
```sql
get_admin_profile()           -- Returns current admin profile via auth.uid()
get_admin_restaurants()       -- Returns restaurants for current admin
check_admin_restaurant_access(restaurant_id) -- Verify access
current_admin_restaurant_ids() -- Used by RLS policies
```

**Current Implementation:**
| File | Current Approach | Should Use |
|------|------------------|------------|
| `hooks/use-admin-restaurants.ts` | Manual 3-query chain (auth → admin_users → admin_user_restaurants) | `get_admin_restaurants()` RPC |
| `lib/auth/admin-check.ts` | Manual email lookup | `get_admin_profile()` RPC |
| API routes | Manual restaurant access checks | `check_admin_restaurant_access()` |

**Recommended Fix:**
```typescript
// Before (hooks/use-admin-restaurants.ts)
const { data: { user } } = await supabase.auth.getUser()
const { data: adminUser } = await supabase.from('admin_users')...
const { data: permissions } = await supabase.from('admin_user_restaurants')...

// After
const { data } = await supabase.rpc('get_admin_restaurants')
return data?.map(r => r.restaurant_id) || []
```

**Benefits:**
- Single RPC call vs 3 queries
- Consistent with RLS policies using same functions
- Better performance

---

### 3. Email vs auth_user_id Matching (LOW PRIORITY)

**Issue:** Most auth checks use email matching:
```typescript
// lib/auth/admin-check.ts line 44
.eq('email', user.email)

// hooks/use-admin-restaurants.ts line 27
.eq('email', user.email)
```

**Database Design:** `admin_users.auth_user_id` is the proper FK to `auth.users.id`

**Risk:** If a customer ever gets a Supabase Auth account with the same email as an admin, they could gain admin access.

**Current Mitigation:** The handoff doc notes: "Only admin users should have Supabase Auth accounts"

**Recommended Fix:**
```typescript
// Use auth_user_id instead of email
const { data: adminUser } = await supabase
  .from('admin_users')
  .select('id, email, first_name, last_name')
  .eq('auth_user_id', user.id)  // More secure
  .is('deleted_at', null)
  .single()
```

**Note:** `app/api/admin-users/me/route.ts` already does this correctly with fallback.

---

### 4. RBAC Helper Functions (LOW PRIORITY)

**Current `lib/rbac.ts`:**
```typescript
export function isRestaurantManager(role: Role | null | undefined): boolean {
  return role?.name === 'Restaurant Manager' && role?.is_system_role === true
}

export function isStaff(role: Role | null | undefined): boolean {
  return role?.name === 'Staff' && role?.is_system_role === true
}
```

**Database Reality:**
- No "Restaurant Manager" role exists (it's "Restaurant Admin")
- No "Staff" role exists

**Recommended Fix:**
```typescript
export function isRestaurantAdmin(role: Role | null | undefined): boolean {
  return role?.name === 'Restaurant Admin' && role?.is_system_role === true
}

// Remove isStaff() or mark as deprecated
```

---

## RLS Policies Created by Dev (For Reference)

The dev created 17 RLS policies using `current_admin_restaurant_ids()`:

**Full CRUD (13 tables):**
- restaurants, restaurant_locations, restaurant_domains
- restaurant_subdomains, restaurant_onboarding, restaurant_payment_options
- restaurant_cuisines, restaurant_schedules, restaurant_special_schedules
- restaurant_delivery_areas, delivery_and_pickup_configs
- restaurant_delivery_companies, restaurant_distance_based_delivery_fees

**Read-Only (3 tables):**
- restaurant_analytics_configs, restaurant_reviews, delivery_company_emails

**Global Lookup:**
- restaurant_tags (authenticated read)

**Impact:** These RLS policies should now handle multi-tenant access automatically at the database level, reducing the need for manual checks in API routes.

---

## Recommended Action Plan

### Phase 1: Critical Fixes (Role IDs)
1. Update `app/api/admin-users/create/route.ts` - change role_id 5 → 2
2. Update admin users UI to show only Super Admin (1) and Restaurant Admin (2)
3. Verify existing admins have valid role_ids (1 or 2)

### Phase 2: Optimization (RPC Functions)
1. Refactor `hooks/use-admin-restaurants.ts` to use `get_admin_restaurants()` RPC
2. Update `lib/auth/admin-check.ts` to use `auth_user_id` matching
3. Consider using `check_admin_restaurant_access()` in API routes

### Phase 3: Cleanup
1. Update `lib/rbac.ts` role names
2. Remove references to Staff role
3. Update role hierarchy documentation

---

## Questions for Dev

1. Should we keep email fallback for admin matching, or strictly use auth_user_id?
2. Are there any admins currently using role_id 5 or 6 that need migration?
3. Should the admin creation flow use the Edge Function `create-admin-user` instead of our API route?

---

**Files Requiring Updates:**
- `app/api/admin-users/create/route.ts`
- `app/admin/users/admin-users/page.tsx`
- `app/admin/users/admin-users/create/page.tsx`
- `lib/rbac.ts`
- `lib/hooks/use-admin-roles.ts`
- `hooks/use-admin-restaurants.ts`
- `lib/auth/admin-check.ts`
