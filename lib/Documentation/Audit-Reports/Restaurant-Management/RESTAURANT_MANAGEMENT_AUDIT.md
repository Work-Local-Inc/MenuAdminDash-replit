# Restaurant Management - Architecture Audit

**Date:** October 22, 2025  
**Status:** 🔴 CRITICAL MISMATCH  
**Impact:** Complete rebuild required

---

## Executive Summary

The existing restaurant management implementation does NOT follow Santiago's documented backend architecture. The code uses custom Supabase queries instead of the 50+ SQL functions and 29 Edge Functions documented in the Frontend Guides.

**Verdict:** Existing implementation must be rebuilt from scratch following Santiago's guides.

---

## What Was Claimed (replit.md)

> ### Phase 2: Restaurant Management ✅ (Completed - Oct 2025)
> - Complete restaurant CRUD with 15 management tabs
> - Mapbox integration for delivery areas
> - Image management with Supabase Storage
> - Full API layer with validation

---

## What Actually Exists

### ✅ What's Correct:
1. **UI Components** - 15 tab components exist in `components/restaurant/tabs/`
2. **Page Structure** - List page and detail page with tab UI
3. **Styling** - Properly styled with shadcn/ui components

### 🔴 What's Wrong (CRITICAL):
1. **API Routes** - Custom Next.js API routes instead of Santiago's Edge Functions
2. **Queries** - Direct Supabase queries instead of SQL functions (`.rpc()`)
3. **Writes** - Direct `.update()` and `.delete()` instead of Edge Function calls
4. **Business Logic** - None of Santiago's 50+ SQL functions are used

---

## Architecture Comparison

### Santiago's Documented Architecture (CORRECT)

**For Reads (GET operations):**
```typescript
// Use SQL functions via supabase.rpc()
const { data, error } = await supabase.rpc('get_restaurants_for_admin', {
  p_search: searchQuery,
  p_province: provinceFilter,
  p_status: statusFilter
});
```

**For Writes (POST/PATCH/DELETE):**
```typescript
// Use Edge Functions
const { data, error } = await supabase.functions.invoke('update-restaurant', {
  body: { restaurant_id: id, updates: {...} }
});
```

**Benefits:**
- ✅ Business logic centralized in database
- ✅ Audit trails automatic
- ✅ Authorization handled server-side
- ✅ Performance optimized (50+ functions!)
- ✅ Consistent across all frontends

---

### Current Implementation (WRONG)

**For Reads:**
```typescript
// Direct Supabase queries
const { data, error } = await supabase
  .from('restaurants')
  .select('*')
  .eq('province', provinceFilter)
```

**For Writes:**
```typescript
// Direct Supabase queries
await supabase
  .from('menuca_v3.restaurants')
  .update(validatedData)
  .eq('id', params.id)
```

**Problems:**
- ❌ No audit trails
- ❌ No server-side business logic
- ❌ Manual filtering (inefficient)
- ❌ No authorization checks
- ❌ Ignores 50+ production-ready SQL functions
- ❌ Duplicate logic if mobile app is built

---

## Detailed Gap Analysis

### Gap 1: Restaurant List (app/admin/restaurants/page.tsx)

**Current Implementation:**
- Hook: `useRestaurants(filters)` → calls `/api/restaurants`
- API Route: `lib/supabase/queries.ts` → `getRestaurants()`
- Query: `.from('restaurants').select('*').eq()...`

**Santiago's Documentation:**
- 📖 Guide: `01-Restaurant-Management-Frontend-Guide.md`
- 📖 Component: `07-SEO-Full-Text-Search.md`
- 🔧 SQL Function: `search_restaurants_full_text(p_query, p_filters)`
- 🔧 SQL Function: `get_restaurants_admin_view()`

**Action Required:**
Replace custom query with Santiago's SQL function for search and filtering.

---

### Gap 2: Soft Delete (DELETE operations)

**Current Implementation:**
```typescript
// app/api/restaurants/[id]/route.ts line 77-80
await supabase
  .from('menuca_v3.restaurants')
  .delete()  // HARD DELETE!
  .eq('id', params.id)
```

**Santiago's Documentation:**
- 📖 Guide: `02-Soft-Delete-Infrastructure.md`
- 🔧 SQL Function: `soft_delete_restaurant(p_restaurant_id, p_admin_id)`
- ⚡ Edge Function: `soft-delete-restaurant` (with audit trail)
- Features: 30-day recovery window, audit logs, GDPR compliance

**Problems:**
- ❌ Current code HARD DELETES (permanent data loss!)
- ❌ No audit trail
- ❌ No recovery window
- ❌ GDPR/CCPA non-compliant

**Action Required:**
Replace DELETE route with soft delete Edge Function call.

---

### Gap 3: Status Management

**Current Implementation:**
- No status toggle functionality
- No audit trail for status changes

**Santiago's Documentation:**
- 📖 Guide: `03-Status-Online-Toggle.md`
- 🔧 SQL Function: `toggle_restaurant_online(p_restaurant_id)`
- 🔧 SQL Function: `check_restaurant_available(p_restaurant_id)`
- ⚡ Edge Function: `update-restaurant-status` (with audit)

**Santiago's Documentation:**
- 📖 Guide: `04-Status-Audit-Trail.md`
- 🔧 SQL Function: `get_status_timeline(p_restaurant_id)`
- 🔧 SQL Function: `get_status_change_stats()`

**Action Required:**
Implement status toggle UI and connect to Santiago's functions.

---

### Gap 4: Contact Management

**Current Implementation:**
- Tab exists: `components/restaurant/tabs/contacts.tsx`
- API route exists: `app/api/restaurants/[id]/contacts/route.ts`
- Unknown if using Santiago's functions

**Santiago's Documentation:**
- 📖 Guide: `05-Contact-Management.md`
- 🔧 SQL Function: `get_primary_contact(p_restaurant_id, p_contact_type)`
- ⚡ Edge Function: `add-restaurant-contact`
- ⚡ Edge Function: `update-restaurant-contact`
- ⚡ Edge Function: `delete-restaurant-contact`

**Action Required:**
Audit contacts tab component - verify it uses Santiago's functions.

---

### Gap 5: PostGIS Delivery Zones

**Current Implementation:**
- Tab exists: `components/restaurant/tabs/delivery-areas.tsx`
- Claims "Mapbox integration complete"
- Unknown if using PostGIS functions

**Santiago's Documentation:**
- 📖 Guide: `06-PostGIS-Delivery-Zones.md`
- 🔧 SQL Function: `check_delivery_available(p_restaurant_id, p_lat, p_lon)` (sub-100ms!)
- 🔧 SQL Function: `find_nearby_restaurants(p_lat, p_lon, p_radius_km)`
- 🔧 SQL Function: `get_zone_area_km2(p_zone_id)`
- ⚡ Edge Function: `create-delivery-zone`
- ⚡ Edge Function: `update-delivery-zone`
- ⚡ Edge Function: `delete-delivery-zone`
- ⚡ Edge Function: `toggle-zone-status`

**Features We're Missing:**
- Precise delivery boundaries (polygons, not circles)
- Zone-based pricing
- Sub-100ms proximity search
- Instant delivery validation

**Action Required:**
Audit delivery areas tab - rebuild to use PostGIS functions.

---

### Gap 6: SEO & Full-Text Search

**Current Implementation:**
```typescript
// lib/supabase/queries.ts line 28-30
if (filters?.search) {
  query = query.ilike('name', `%${filters.search}%`)  // Basic ILIKE search
}
```

**Santiago's Documentation:**
- 📖 Guide: `07-SEO-Full-Text-Search.md`
- 🔧 SQL Function: `search_restaurants_full_text(p_query, p_filters)`
- 🔧 SQL Function: `get_restaurant_by_slug(p_slug)`
- 📊 View: `restaurants_featured_view`

**Features We're Missing:**
- Full-text search (ts_rank algorithm)
- Relevance ranking
- SEO-friendly URLs
- Sub-50ms response time

**Performance Impact:**
- Current: ILIKE scan (slow on 277 restaurants, O(n))
- Santiago's: Full-text index (sub-50ms, O(log n))

**Action Required:**
Replace ILIKE search with Santiago's full-text search function.

---

### Gap 7: Franchise/Chain Hierarchy

**Current Implementation:**
- No franchise management
- No multi-location support

**Santiago's Documentation:**
- 📖 Guide: `01-Franchise-Chain-Hierarchy.md`
- 🔧 SQL Functions: 13 functions for franchise management
- ⚡ Edge Functions: 3 functions for writes
- Features: Parent-child relationships, bulk operations, franchise analytics

**Action Required:**
Add franchise management tab and implement all 13 SQL functions.

---

### Gap 8: Restaurant Categorization

**Current Implementation:**
- No category/tag system visible

**Santiago's Documentation:**
- 📖 Guide: `08-Categorization-System.md`
- 🔧 SQL Function: `get_restaurants_by_tags(p_tag_ids)`
- 🔧 SQL Function: `get_popular_tags()`
- 🔧 SQL Function: `search_by_cuisine_type(p_cuisine_types)`
- ⚡ Edge Function: `add-restaurant-tags`
- ⚡ Edge Function: `remove-restaurant-tags`
- ⚡ Edge Function: `bulk-update-tags`

**Features We're Missing:**
- Tag-based filtering
- Cuisine categorization
- Dietary tags (vegan, gluten-free, etc.)
- Feature tags (outdoor seating, WiFi, etc.)

**Action Required:**
Add categorization tab and implement tag management.

---

### Gap 9: Onboarding Status Tracking

**Current Implementation:**
- No onboarding workflow
- No completion tracking

**Santiago's Documentation:**
- 📖 Guide: `09-Onboarding-Status-Tracking.md`
- 🔧 SQL Function: `get_onboarding_status(p_restaurant_id)`
- 🔧 SQL Function: `calculate_completion_percentage(p_restaurant_id)`
- 🔧 SQL Function: `get_pending_onboarding_steps(p_restaurant_id)`
- 🔧 SQL Function: `get_onboarding_dashboard()`
- ⚡ Edge Function: `mark-onboarding-step-complete`
- ⚡ Edge Function: `skip-onboarding-step`
- ⚡ Edge Function: `reset-onboarding`

**Action Required:**
Add onboarding tracking system (critical for new restaurants).

---

### Gap 10: Restaurant Onboarding System

**Current Implementation:**
- No structured onboarding flow

**Santiago's Documentation:**
- 📖 Guide: `10-Restaurant-Onboarding-System.md`
- 🔧 SQL Functions: 9 functions
- ⚡ Edge Functions: 4 functions
- Features: Complete lifecycle, validation, notifications

**Action Required:**
Implement full onboarding wizard for new restaurants.

---

### Gap 11: Domain Verification & SSL

**Current Implementation:**
- Tab exists: `components/restaurant/tabs/domains.tsx`
- Unknown if using Santiago's functions

**Santiago's Documentation:**
- 📖 Guide: `11-Domain-Verification-SSL.md`
- 🔧 SQL Function: `get_domain_verification_status(p_domain_id)`
- 🔧 SQL Function: `check_domain_availability(p_domain_name)`
- ⚡ Edge Function: `verify-domain-ownership`
- ⚡ Edge Function: `provision-ssl-certificate`

**Action Required:**
Audit domains tab - implement domain verification flow.

---

## Summary of Gaps

| Component | Santiago's Functions | Currently Used | Gap |
|-----------|---------------------|----------------|-----|
| 1. Franchise Hierarchy | 13 SQL + 3 Edge | 0 | 16 functions missing |
| 2. Soft Delete | 3 SQL + 3 Edge | 0 | 6 functions missing |
| 3. Status & Online Toggle | 3 SQL + 3 Edge | 0 | 6 functions missing |
| 4. Status Audit Trail | 2 SQL + 1 Edge | 0 | 3 functions missing |
| 5. Contact Management | 1 SQL + 3 Edge | Unknown | Needs audit |
| 6. PostGIS Delivery Zones | 8 SQL + 4 Edge | Unknown | Needs audit |
| 7. SEO & Full-Text Search | 2 SQL + 0 Edge | 0 (using ILIKE) | 2 functions missing |
| 8. Categorization | 3 SQL + 3 Edge | 0 | 6 functions missing |
| 9. Onboarding Status | 4 SQL + 3 Edge | 0 | 7 functions missing |
| 10. Restaurant Onboarding | 9 SQL + 4 Edge | 0 | 13 functions missing |
| 11. Domain Verification | 2 SQL + 2 Edge | Unknown | Needs audit |

**Total:** 50 SQL Functions + 29 Edge Functions = **79 functions**  
**Currently Used:** ~0-5 functions (estimated)  
**Missing:** ~74 functions (93% of backend!)

---

## Impact Assessment

### Functionality Gaps:
- ❌ No soft delete (permanent data loss risk)
- ❌ No audit trails (compliance risk)
- ❌ Inefficient search (performance risk)
- ❌ No franchise management (business requirement)
- ❌ No onboarding workflow (UX gap)
- ❌ Missing 93% of Santiago's backend

### Security Gaps:
- ❌ No server-side authorization
- ❌ Direct database writes (bypass business logic)
- ❌ No audit logging
- ❌ Non-GDPR compliant deletes

### Performance Gaps:
- ❌ Full table scans instead of indexed searches
- ❌ N+1 query problems
- ❌ No query optimization
- ❌ Missing sub-100ms PostGIS functions

---

## Recommended Action Plan

### Phase 1: Immediate Fixes (Week 1)
1. **Replace soft deletes** - Switch to Santiago's soft delete Edge Function
2. **Replace search** - Use full-text search SQL function
3. **Add status audit** - Implement status change tracking

### Phase 2: Core Features (Week 2-3)
4. **Franchise management** - Implement all 13 SQL functions
5. **PostGIS delivery zones** - Rebuild with proper PostGIS functions
6. **Contact management** - Audit and fix if needed
7. **Domain verification** - Audit and implement verification flow

### Phase 3: Onboarding & UX (Week 4)
8. **Onboarding system** - Build complete onboarding wizard
9. **Categorization** - Add tag/category management
10. **Status toggle** - Add online/offline toggle with real-time updates

### Implementation Strategy

**For each component:**
1. Read Santiago's guide
2. List all SQL functions and Edge functions
3. Create wrapper hooks (e.g., `useRestaurantSearch()`)
4. Replace API routes with function calls
5. Update UI components
6. Test against production database
7. Document integration

**Example Refactor (Search):**

```typescript
// BEFORE (lib/supabase/queries.ts)
export async function getRestaurants(filters) {
  const supabase = await createClient()
  let query = supabase.from('restaurants').select('*')
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`)
  return query
}

// AFTER (lib/hooks/use-restaurant-search.ts)
export function useRestaurantSearch(query: string) {
  const supabase = createClientComponentClient()
  
  return useQuery({
    queryKey: ['restaurant-search', query],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_restaurants_full_text', {
        p_query: query,
        p_filters: {}
      })
      if (error) throw error
      return data
    }
  })
}
```

---

## Conclusion

**Status:** 🔴 CRITICAL MISMATCH

The existing restaurant management implementation does not follow Santiago's documented architecture. Only the UI structure exists - all backend integration is wrong.

**Recommendation:** Rebuild restaurant management following Santiago's guides exactly. The 50+ SQL functions and 29 Edge functions are already deployed in production - we just need to use them correctly.

**Estimated Rebuild Time:** 3-4 weeks for full compliance

**Priority:** HIGH - This affects data integrity, compliance, and performance
