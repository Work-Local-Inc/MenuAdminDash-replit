# RBAC Security Audit Report

**Project:** Menu.ca Admin Dashboard
**Audit Date:** January 28, 2026
**Auditor:** Claude Code
**For:** Development Team Handoff

---

## Executive Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 6 | No authentication - publicly accessible admin endpoints |
| **HIGH** | 30+ | Auth present but no restaurant ownership verification |
| **MEDIUM** | 3 | Edge cases and incomplete validation |

**Bottom Line:** 6 admin endpoints are completely unprotected. Anyone with the URL can read/modify promotional campaigns, trigger migrations, and enumerate restaurant data. Additionally, ~30 routes allow Restaurant Admins to access data from restaurants they don't manage.

---

## Priority 1: CRITICAL (Fix Immediately)

These endpoints have **NO AUTHENTICATION** - anyone on the internet can access them.

### 1.1 Promotional Campaigns - Full CRUD Unprotected

**File:** `app/api/admin/promotions/campaigns/[id]/route.ts`
**Methods:** GET, PATCH, DELETE
**Risk:** Anyone can read, modify, or delete promotional campaigns

```typescript
// CURRENT (VULNERABLE) - Line 13
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    // NO AUTH CHECK - proceeds directly to database query
```

**What's Exposed:**
- Campaign details, discount values, coupon codes
- Redemption statistics and revenue data
- Promotion targets and tier configurations

---

### 1.2 Promotional Campaigns - Create Unprotected

**File:** `app/api/admin/promotions/campaigns/route.ts`
**Method:** POST
**Risk:** Anyone can create promotional campaigns

---

### 1.3 Promotion Targeting - Information Disclosure

**File:** `app/api/admin/promotions/targeting/route.ts`
**Method:** GET
**Risk:** Enumerate all courses/dishes for any restaurant via `?restaurant=` param

---

### 1.4 Promotion Templates - Information Disclosure

**File:** `app/api/admin/promotions/templates/route.ts`
**Method:** GET
**Risk:** Read all promotion template configurations

---

### 1.5 Admin Roles Migration - Privilege Escalation

**File:** `app/api/migrate/admin-roles/route.ts`
**Method:** POST
**Risk:** Anyone can trigger migration that modifies admin_users table roles

---

### 1.6 Modifier Groups - Menu Manipulation

**File:** `app/api/menu/dishes/[id]/modifier-groups/route.ts`
**Methods:** GET, POST
**Risk:** Create/read modifier groups for any dish without auth

---

## Priority 2: HIGH (Fix Within 72 Hours)

These endpoints call `verifyAdminAuth()` but **don't verify restaurant ownership** for Restaurant Admins.

### The Pattern Problem

Restaurant Admin (role_id=2) should only access their assigned restaurants.
Currently, auth checks pass, but the `[id]` parameter is never validated against `admin_user_restaurants`.

**Affected Routes (30+ endpoints):**

| Route Pattern | Methods | Issue |
|---------------|---------|-------|
| `/restaurants/[id]/contacts` | GET, POST | Can view/add contacts for any restaurant |
| `/restaurants/[id]/images` | GET, POST, PATCH, DELETE | Can manage images for any restaurant |
| `/restaurants/[id]/domains` | GET, POST | Can view/create domains for any restaurant |
| `/restaurants/[id]/schedules` | GET, POST, PATCH | Can manage hours for any restaurant |
| `/restaurants/[id]/delivery-areas` | GET, POST, DELETE | Can manage delivery zones for any restaurant |
| `/restaurants/[id]/locations` | GET, POST, PATCH | Can manage locations for any restaurant |
| `/restaurants/[id]/payment-methods` | GET, POST | Can manage payments for any restaurant |
| `/restaurants/[id]/integrations` | GET, POST | Can manage integrations for any restaurant |
| `/restaurants/[id]/tags` | GET, POST | Can manage tags for any restaurant |
| `/restaurants/[id]/cuisines` | GET, POST | Can manage cuisines for any restaurant |
| `/restaurants/[id]/seo` | GET, PATCH | Can manage SEO for any restaurant |
| `/restaurants/[id]/service-config` | GET, PATCH | Can manage service config for any restaurant |
| `/menu/dishes` | GET, POST | `restaurant_id` param/body not validated |
| `/menu/courses` | GET, POST | `restaurant_id` param/body not validated |

---

## Priority 3: MEDIUM (Fix Within 1 Week)

### 3.1 Dashboard Stats Edge Case

**File:** `app/api/dashboard/stats/route.ts`
**Issue:** If Restaurant Admin has zero assignments, returns stats for ALL restaurants (empty array not handled)

### 3.2 Implicit Role Assumptions

**Multiple Files**
**Issue:** Code assumes `role_id === 1` means Super Admin without explicit validation. If role system changes, logic breaks silently.

---

## Sample Patches

### Patch 1: Fix Unprotected Campaign Routes

**File:** `app/api/admin/promotions/campaigns/[id]/route.ts`

```diff
 import { NextRequest, NextResponse } from 'next/server';
 import { createClient } from '@/lib/supabase/server';
+import { verifyAdminAuth } from '@/lib/auth/admin-check';
+import { AuthError } from '@/lib/errors';
 import { UpdateCampaignSchema } from '@/lib/validations/promotions';

 /**
  * GET /api/admin/promotions/campaigns/:id
  */
 export async function GET(request: NextRequest, { params }: RouteParams) {
   try {
+    // Verify admin authentication
+    const { adminUser } = await verifyAdminAuth(request);
+
     const { id } = await params;
     const campaignId = parseInt(id, 10);

     // ... rest of function
+  } catch (error) {
+    if (error instanceof AuthError) {
+      return NextResponse.json({ error: error.message }, { status: error.statusCode });
+    }
+    // ... existing error handling
   }
 }

 /**
  * PATCH /api/admin/promotions/campaigns/:id
  */
 export async function PATCH(request: NextRequest, { params }: RouteParams) {
   try {
+    // Verify admin authentication - only Super Admin can modify campaigns
+    const { adminUser } = await verifyAdminAuth(request);
+    if (adminUser.role_id !== 1) {
+      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
+    }
+
     const { id } = await params;
     // ... rest of function
   }
 }

 /**
  * DELETE /api/admin/promotions/campaigns/:id
  */
 export async function DELETE(request: NextRequest, { params }: RouteParams) {
   try {
+    // Verify admin authentication - only Super Admin can delete campaigns
+    const { adminUser } = await verifyAdminAuth(request);
+    if (adminUser.role_id !== 1) {
+      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
+    }
+
     const { id } = await params;
     // ... rest of function
   }
 }
```

---

### Patch 2: Create Restaurant Access Helper

**New File:** `lib/auth/restaurant-access.ts`

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

interface AdminUser {
  id: number;
  role_id: number;
}

/**
 * Check if an admin user has access to a specific restaurant
 * - Super Admin (role_id=1): Always has access
 * - Restaurant Admin (role_id=2): Must be in admin_user_restaurants
 */
export async function checkRestaurantAccess(
  adminUser: AdminUser,
  restaurantId: number | string
): Promise<{ hasAccess: boolean; error?: string }> {
  // Super Admin has access to all restaurants
  if (adminUser.role_id === 1) {
    return { hasAccess: true };
  }

  // Restaurant Admin - check assignments
  const supabase = createAdminClient();
  const restId = typeof restaurantId === 'string' ? parseInt(restaurantId, 10) : restaurantId;

  if (isNaN(restId)) {
    return { hasAccess: false, error: 'Invalid restaurant ID' };
  }

  const { data: assignment, error } = await (supabase as any)
    .schema('menuca_v3')
    .from('admin_user_restaurants')
    .select('id')
    .eq('admin_user_id', adminUser.id)
    .eq('restaurant_id', restId)
    .single();

  if (error || !assignment) {
    return { hasAccess: false, error: 'Access denied to this restaurant' };
  }

  return { hasAccess: true };
}

/**
 * Get all restaurant IDs an admin has access to
 * Returns undefined for Super Admin (meaning "all")
 */
export async function getAdminRestaurantIds(
  adminUser: AdminUser
): Promise<number[] | undefined> {
  // Super Admin has access to all
  if (adminUser.role_id === 1) {
    return undefined;
  }

  const supabase = createAdminClient();

  const { data: assignments, error } = await (supabase as any)
    .schema('menuca_v3')
    .from('admin_user_restaurants')
    .select('restaurant_id')
    .eq('admin_user_id', adminUser.id);

  if (error) {
    console.error('Failed to fetch restaurant assignments:', error);
    return [];
  }

  return (assignments || []).map((a: { restaurant_id: number }) => a.restaurant_id);
}
```

---

### Patch 3: Fix Restaurant Sub-Resource Routes

**Example Fix for:** `app/api/restaurants/[id]/contacts/route.ts`

```diff
 import { NextRequest, NextResponse } from 'next/server';
 import { verifyAdminAuth } from '@/lib/auth/admin-check';
+import { checkRestaurantAccess } from '@/lib/auth/restaurant-access';
 import { createAdminClient } from '@/lib/supabase/admin';

 export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> }
 ) {
   try {
     const { id } = await params;
     const { adminUser } = await verifyAdminAuth(request);

+    // Verify restaurant access
+    const { hasAccess, error: accessError } = await checkRestaurantAccess(adminUser, id);
+    if (!hasAccess) {
+      return NextResponse.json(
+        { error: accessError || 'Access denied' },
+        { status: 403 }
+      );
+    }
+
     // ... rest of function (existing code)
   }
 }
```

**Apply this same pattern to all `/restaurants/[id]/*` routes.**

---

### Patch 4: Fix Menu Routes

**File:** `app/api/menu/dishes/route.ts`

```diff
 export async function GET(request: NextRequest) {
   try {
     const { adminUser } = await verifyAdminAuth(request);
     const searchParams = request.nextUrl.searchParams;
     const restaurantId = searchParams.get('restaurant_id');

+    // Validate restaurant access
+    if (restaurantId) {
+      const { hasAccess, error } = await checkRestaurantAccess(adminUser, restaurantId);
+      if (!hasAccess) {
+        return NextResponse.json({ error: error || 'Access denied' }, { status: 403 });
+      }
+    } else if (adminUser.role_id !== 1) {
+      // Restaurant Admin must specify restaurant_id
+      return NextResponse.json(
+        { error: 'restaurant_id required for Restaurant Admin' },
+        { status: 400 }
+      );
+    }
+
     // ... rest of function
   }
 }

 export async function POST(request: NextRequest) {
   try {
     const { adminUser } = await verifyAdminAuth(request);
     const body = await request.json();

+    // Validate restaurant access for the target restaurant
+    if (!body.restaurant_id) {
+      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
+    }
+
+    const { hasAccess, error } = await checkRestaurantAccess(adminUser, body.restaurant_id);
+    if (!hasAccess) {
+      return NextResponse.json({ error: error || 'Access denied' }, { status: 403 });
+    }
+
     // ... rest of function
   }
 }
```

---

## Implementation Checklist

### Immediate (Today)

- [ ] Add `verifyAdminAuth()` to `app/api/admin/promotions/campaigns/[id]/route.ts`
- [ ] Add `verifyAdminAuth()` to `app/api/admin/promotions/campaigns/route.ts`
- [ ] Add `verifyAdminAuth()` to `app/api/admin/promotions/targeting/route.ts`
- [ ] Add `verifyAdminAuth()` to `app/api/admin/promotions/templates/route.ts`
- [ ] Add `verifyAdminAuth()` to `app/api/migrate/admin-roles/route.ts` (Super Admin only)
- [ ] Add `verifyAdminAuth()` to `app/api/menu/dishes/[id]/modifier-groups/route.ts`

### This Week

- [ ] Create `lib/auth/restaurant-access.ts` helper
- [ ] Add `checkRestaurantAccess()` to all `/restaurants/[id]/*` routes (30+ files)
- [ ] Add restaurant validation to `/menu/dishes` and `/menu/courses`
- [ ] Add empty assignment check to dashboard stats

### Testing

After each fix:
1. Test as Super Admin - should have full access
2. Test as Restaurant Admin - should only see assigned restaurants
3. Test unauthenticated - should get 401
4. Test Restaurant Admin accessing wrong restaurant - should get 403

---

## Files Reference

### Unprotected (No Auth)
```
app/api/admin/promotions/campaigns/[id]/route.ts
app/api/admin/promotions/campaigns/route.ts
app/api/admin/promotions/targeting/route.ts
app/api/admin/promotions/templates/route.ts
app/api/admin/setup-modifiers/route.ts
app/api/migrate/admin-roles/route.ts
app/api/menu/dishes/[id]/modifier-groups/route.ts
```

### Auth Present, No Ownership Check
```
app/api/restaurants/[id]/contacts/route.ts
app/api/restaurants/[id]/images/route.ts
app/api/restaurants/[id]/domains/route.ts
app/api/restaurants/[id]/schedules/route.ts
app/api/restaurants/[id]/delivery-areas/route.ts
app/api/restaurants/[id]/locations/route.ts
app/api/restaurants/[id]/payment-methods/route.ts
app/api/restaurants/[id]/integrations/route.ts
app/api/restaurants/[id]/tags/route.ts
app/api/restaurants/[id]/cuisines/route.ts
app/api/restaurants/[id]/seo/route.ts
app/api/restaurants/[id]/service-config/route.ts
app/api/menu/dishes/route.ts
app/api/menu/courses/route.ts
```

### Reference (Correctly Implemented)
```
app/api/restaurants/route.ts              # Good pattern for role-based filtering
app/api/admin-users/[id]/route.ts         # Good pattern for Super Admin checks
lib/auth/admin-check.ts                   # Auth verification function
```

---

## Questions for Team

1. **Should Restaurant Admins be able to create/edit promotions?** Currently campaigns seem to be a platform-level feature (no restaurant_id). Clarify ownership model.

2. **Is `/api/migrate/admin-roles` still needed?** Migration endpoints should be removed or heavily protected post-migration.

3. **Are there any routes intentionally public?** Double-check before protecting everything.

---

*Report generated by Claude Code - January 28, 2026*
