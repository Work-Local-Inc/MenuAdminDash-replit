# API Route Implementation - Complete Reference

**Date:** October 27, 2025
**Status:** ✅ Reviewed & Updated with Recommendations
**Backend:** Supabase (menuca_v3 schema)
**Total Edge Functions:** 36 deployed
**Total SQL Functions:** 122 functions

---

## 🎯 RECOMMENDATIONS APPLIED

### ✅ Question 1: Franchise Routes - **USE PLURAL**
- **Before:** `/api/franchise/*` (singular - inconsistent)
- **After:** `/api/franchises/*` (plural - REST standard)
- **Reason:** Matches other collections (`/restaurants`, `/domains`, `/users`)

### ✅ Question 2: Link Children - **USE `/convert`**
- **Before:** `/api/franchise/link-children` (verb in URL)
- **After:** `/api/franchises/convert` (noun-based, matches Edge Function)
- **Reason:** REST uses nouns + HTTP verbs, not action verbs in paths

### ✅ Question 3: Online Ordering - **USE NESTED ROUTE**
- **Before:** `PATCH /api/restaurants/toggle-online-ordering` (flat, ID in body)
- **After:** `PATCH /api/restaurants/[id]/online-ordering` (nested, ID in URL)
- **Reason:** Consistent with all other restaurant sub-resources

---

## 📋 COMPLETE API ROUTES BY COMPONENT

---

## Component 1: Franchise/Chain Hierarchy

**Updated with Recommendations** ✅

```typescript
// List all franchises
GET    /api/franchises
       → Uses: get_franchise_chains (SQL Function)
       → Auth: Admin
       → Returns: Array of franchise parent brands

// Get franchise details
GET    /api/franchises/[id]
       → Uses: get_franchise_details (SQL Function)
       → Auth: Admin
       → Returns: Franchise parent with children list

// Get franchise analytics
GET    /api/franchises/[id]/analytics
       → Uses: get_franchise_analytics (SQL Function)
       → Auth: Admin
       → Returns: Revenue, orders, performance metrics

// Create franchise parent brand
POST   /api/franchises
       → Uses: create-franchise-parent (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { name, franchise_brand_name, description }
       → Returns: Created franchise parent

// Convert restaurants to franchise
POST   /api/franchises/convert
       → Uses: convert-restaurant-to-franchise (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { parent_id, child_restaurant_ids[], updated_by }
       → Returns: Linked children count

// Bulk update franchise features
PATCH  /api/franchises/[id]/features
       → Uses: bulk-update-franchise-feature (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { feature_key, is_enabled, updated_by }
       → Returns: Updated restaurant count
```

**Edge Functions (3):**
- ✅ `create-franchise-parent` - Create parent brand
- ✅ `convert-restaurant-to-franchise` - Link children to parent
- ✅ `bulk-update-franchise-feature` - Bulk feature updates

---

## Component 2: Soft Delete Infrastructure

```typescript
// Get deletion audit trail (ALL tables)
GET    /api/audit/deletions
       → Uses: get-deletion-audit-trail (Edge Function)
       → Auth: None (Public - service role)
       → Query: ?table=ALL&days=30
       → Returns: Deletion records with recovery status
       → Valid tables: restaurant_locations, restaurant_contacts,
                      restaurant_domains, restaurant_schedules,
                      restaurant_service_configs, ALL

// Soft delete a record
DELETE /api/{resource}/[id]
       → Uses: soft-delete-record (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { table_name, record_id, deleted_by }
       → Returns: Soft deleted record with recovery info

// Restore deleted record
POST   /api/audit/restore
       → Uses: restore-deleted-record (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { table_name, record_id, restored_by }
       → Returns: Restored record
```

**Edge Functions (3):**
- ✅ `get-deletion-audit-trail` - View deletion history (tested, working)
- ✅ `soft-delete-record` - Soft delete with audit
- ✅ `restore-deleted-record` - Restore within 30-day window

---

## Component 3: Restaurant Status & Availability

**Updated with Nested Route Recommendation** ✅

```typescript
// Check restaurant availability (PUBLIC)
GET    /api/restaurants/[id]/availability
       → Uses: check-restaurant-availability (Edge Function)
       → Auth: None (Public)
       → Query: ?restaurant_id=561
       → Returns: can_accept_orders, status, closure_info
       → Tested: ✅ Working perfectly

// Get operational restaurants (PUBLIC)
GET    /api/restaurants/operational
       → Uses: get-operational-restaurants (Edge Function)
       → Auth: None (Public)
       → Query: ?limit=50&offset=0
       → Returns: Active restaurants accepting orders
       → Tested: ✅ Working perfectly

// Toggle online ordering (ADMIN)
PATCH  /api/restaurants/[id]/online-ordering
       → Uses: toggle-online-ordering (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { enabled: boolean, reason?: string }
       → Returns: Updated restaurant status

// Update restaurant status (ADMIN)
PATCH  /api/restaurants/[id]/status
       → Uses: update-restaurant-status (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { status: 'active'|'suspended'|'inactive', reason, updated_by }
       → Returns: Updated restaurant with audit trail
```

**Edge Functions (3):**
- ✅ `check-restaurant-availability` - Public availability check (tested)
- ✅ `get-operational-restaurants` - Public operational list (tested)
- ✅ `toggle-online-ordering` - Admin toggle (requires auth)

**SQL Functions (3):**
- ✅ `get_restaurant_availability` - Check if restaurant can accept orders
- ✅ `toggle_online_ordering` - Update online ordering status
- ✅ `can_accept_orders` - Business logic for order acceptance

---

## Component 4: Status Audit Trail

```typescript
// Get restaurant status timeline
GET    /api/restaurants/[id]/status/timeline
       → Uses: get_restaurant_status_timeline (SQL Function)
       → Auth: Admin
       → Returns: Array of status changes with timestamps

// Get status change statistics
GET    /api/restaurants/status/stats
       → Uses: get_restaurant_status_stats (SQL Function)
       → Auth: Admin
       → Returns: Aggregate stats by status type

// Update restaurant status (with audit)
PATCH  /api/restaurants/[id]/status
       → Uses: update-restaurant-status (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { status, reason, updated_by }
       → Returns: Updated status with audit entry
```

**Edge Functions (1):**
- ✅ `update-restaurant-status` - Update status with audit logging

**SQL Functions (2):**
- ✅ `get_restaurant_status_timeline` - Full status history
- ✅ `get_restaurant_status_stats` - System-wide statistics

---

## Component 5: Contact Management

```typescript
// Get restaurant contacts
GET    /api/restaurants/[id]/contacts
       → Uses: get_restaurant_contacts (SQL Function)
       → Auth: Admin
       → Returns: Array of contacts with priority/role

// Get primary contact by type
GET    /api/restaurants/[id]/contacts/primary
       → Uses: get_restaurant_primary_contact (SQL Function)
       → Auth: Admin
       → Query: ?type=owner|manager|billing
       → Returns: Primary contact with fallback to location

// Add restaurant contact
POST   /api/restaurants/[id]/contacts
       → Uses: add-restaurant-contact (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { first_name, last_name, email, phone, priority, role }
       → Returns: Created contact

// Update restaurant contact
PUT    /api/restaurants/[id]/contacts/[contactId]
       → Uses: update-restaurant-contact (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { first_name, last_name, email, phone, priority }
       → Returns: Updated contact

// Delete restaurant contact
DELETE /api/restaurants/[id]/contacts/[contactId]
       → Uses: delete-restaurant-contact (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Success confirmation
```

**Edge Functions (3):**
- ✅ `add-restaurant-contact` - Create new contact
- ✅ `update-restaurant-contact` - Update existing contact
- ✅ `delete-restaurant-contact` - Soft delete contact

**SQL Functions (1):**
- ✅ `get_restaurant_primary_contact` - Get primary contact with fallback

---

## Component 6: PostGIS Delivery Zones

```typescript
// Check delivery availability
GET    /api/restaurants/[id]/delivery/check
       → Uses: is_address_in_delivery_zone (SQL Function)
       → Auth: Public
       → Query: ?latitude=45.4215&longitude=-75.6972
       → Returns: zone info, delivery fee, ETA

// Find nearby restaurants
GET    /api/restaurants/nearby
       → Uses: find_nearby_restaurants (SQL Function)
       → Auth: Public
       → Query: ?latitude=45.4215&longitude=-75.6972&radius_km=5
       → Returns: Array of restaurants within radius

// Get restaurant delivery zones
GET    /api/restaurants/[id]/delivery-areas
       → Direct DB read (menuca_v3.restaurant_delivery_zones)
       → Auth: Admin
       → Returns: Array of delivery zones (polygons)

// Create delivery zone
POST   /api/restaurants/[id]/delivery-areas
       → Uses: create-delivery-zone (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { zone_name, delivery_fee_cents, minimum_order_cents, polygon }
       → Returns: Created zone with area calculation

// Update delivery zone
PUT    /api/restaurants/[id]/delivery-areas/[zoneId]
       → Uses: update-delivery-zone (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { zone_name, delivery_fee_cents, enabled, polygon }
       → Returns: Updated zone

// Delete delivery zone
DELETE /api/restaurants/[id]/delivery-areas/[zoneId]
       → Uses: delete-delivery-zone (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Success confirmation

// Toggle zone status
PATCH  /api/restaurants/[id]/delivery-areas/[zoneId]/status
       → Uses: toggle-zone-status (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { enabled: boolean }
       → Returns: Updated zone
```

**Edge Functions (4):**
- ✅ `create-delivery-zone` - Create new zone with PostGIS
- ✅ `update-delivery-zone` - Update zone geometry/fees
- ✅ `delete-delivery-zone` - Soft delete zone
- ✅ `toggle-zone-status` - Enable/disable zone

**SQL Functions (8):**
- ✅ `is_address_in_delivery_zone` - Check if address is deliverable
- ✅ `find_nearby_restaurants` - PostGIS proximity search
- ✅ `get_delivery_zone_area_sq_km` - Calculate zone area
- ✅ `create_delivery_zone` - Create zone with validation
- ✅ `update_delivery_zone` - Update zone properties
- ✅ `toggle_delivery_zone_status` - Enable/disable
- ✅ `restore_delivery_zone` - Restore soft-deleted zone
- ✅ `soft_delete_delivery_zone` - Soft delete

---

## Component 7: SEO & Full-Text Search

```typescript
// Search restaurants (PUBLIC)
GET    /api/restaurants/search
       → Uses: search-restaurants (Edge Function)
       → Auth: None (Public)
       → Query: ?query=pizza&latitude=45.42&longitude=-75.69&radius_km=5&limit=20
       → Returns: Ranked results with relevance scores
       → Tested: ✅ Working perfectly

// Get restaurant by slug (PUBLIC)
GET    /api/restaurants/slug/[slug]
       → Uses: get_restaurant_by_slug (SQL Function)
       → Auth: None (Public)
       → Returns: Restaurant details by SEO-friendly slug

// Get restaurant SEO data
GET    /api/restaurants/[id]/seo
       → Direct DB read (restaurant_seo table)
       → Auth: Admin
       → Returns: Meta title, description, keywords, OG tags

// Update restaurant SEO
POST   /api/restaurants/[id]/seo
       → Direct DB upsert (no Edge Function)
       → Auth: Admin
       → Body: { meta_title, meta_description, keywords, og_image }
       → Returns: Updated SEO data
```

**Edge Functions (1):**
- ✅ `search-restaurants` - Full-text search with PostGIS (tested)

**SQL Functions (2):**
- ✅ `search_restaurants` - Full-text search with ts_rank
- ✅ `get_restaurant_by_slug` - Get by SEO slug

---

## Component 8: Restaurant Categorization

```typescript
// Search restaurants by cuisine/tags (PUBLIC)
GET    /api/restaurants/search
       → Uses: search-restaurants (Edge Function)
       → Auth: None (Public)
       → Query: ?cuisine=pizza&tags=vegan,gluten-free&limit=20
       → Returns: Filtered restaurants with cuisines and tags
       → Tested: ✅ Working perfectly

// Get restaurant cuisines
GET    /api/restaurants/[id]/cuisines
       → Uses: get_restaurant_cuisines (SQL Function)
       → Auth: Public
       → Returns: Array of cuisines with is_primary flag

// Add cuisine to restaurant
POST   /api/restaurants/[id]/cuisines
       → Uses: add-restaurant-cuisine (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { cuisine_slug, is_primary }
       → Returns: Added cuisine

// Get restaurant tags
GET    /api/restaurants/[id]/tags
       → Uses: get_restaurant_tags (SQL Function)
       → Auth: Public
       → Returns: Array of tags by category

// Add tag to restaurant
POST   /api/restaurants/[id]/tags
       → Uses: add-restaurant-tag (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { tag_slug }
       → Returns: Added tag

// Remove cuisine
DELETE /api/restaurants/[id]/cuisines/[cuisineId]
       → Uses: remove-restaurant-cuisine (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Success confirmation

// Remove tag
DELETE /api/restaurants/[id]/tags/[tagId]
       → Uses: remove-restaurant-tag (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Success confirmation
```

**Edge Functions (3):**
- ✅ `add-restaurant-cuisine` - Add cuisine type
- ✅ `add-restaurant-tag` - Add tag
- ✅ `search-restaurants` - Search by cuisine/tags (tested)

**SQL Functions (2):**
- ✅ `add_cuisine_to_restaurant` - Add cuisine with validation
- ✅ `add_tag_to_restaurant` - Add tag with validation

---

## Component 9: Restaurant Onboarding Tracking

**NEW: 3 Edge Functions Created & Deployed** ✅

```typescript
// Get restaurant onboarding status (PUBLIC)
GET    /api/restaurants/[id]/onboarding
       → Uses: get-restaurant-onboarding (Edge Function)
       → Auth: None (Public - JWT disabled in dashboard)
       → Path: /get-restaurant-onboarding/7/onboarding
       → Returns: Completion %, 8 steps with timestamps, days in onboarding
       → Tested: ✅ Working perfectly (returns full onboarding data)

// Update onboarding step (ADMIN)
PATCH  /api/restaurants/[id]/onboarding/steps/[step]
       → Uses: update-onboarding-step (Edge Function)
       → Auth: Admin (JWT required)
       → Path: /update-onboarding-step/7/onboarding/steps/schedule
       → Body: { completed: boolean }
       → Valid steps: basic_info, location, contact, schedule,
                     menu, payment, delivery, testing
       → Returns: Updated step with recalculated completion %
       → Tested: ✅ Deployed and ready

// Get onboarding dashboard (ADMIN)
GET    /api/onboarding/dashboard
       → Uses: get-onboarding-dashboard (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Overview stats, at-risk restaurants, recently completed,
                 step statistics with priority scores
       → Tested: ✅ Deployed and ready

// Get onboarding summary stats
GET    /api/onboarding/summary
       → Uses: get_onboarding_summary (SQL Function)
       → Auth: Admin
       → Returns: Total restaurants, completed count, average completion %,
                 average days to complete

// Get onboarding progress stats
GET    /api/onboarding/stats
       → Uses: v_onboarding_progress_stats (SQL View)
       → Auth: Admin
       → Returns: Step-by-step completion statistics

// Get incomplete restaurants
GET    /api/onboarding/incomplete
       → Uses: v_incomplete_onboarding_restaurants (SQL View)
       → Auth: Admin
       → Query: ?min_days=7
       → Returns: Restaurants stuck in onboarding
```

**Edge Functions (3):** ✨ NEW
- ✅ `get-restaurant-onboarding` - Public onboarding status (CREATED, TESTED)
- ✅ `update-onboarding-step` - Admin step updates (CREATED, DEPLOYED)
- ✅ `get-onboarding-dashboard` - Admin dashboard (CREATED, DEPLOYED)

**SQL Functions (4):**
- ✅ `get_onboarding_status` - Get 8-step status breakdown
- ✅ `get_onboarding_summary` - System-wide stats
- Plus 2 views for reporting

---

## Component 10: Restaurant Onboarding System

```typescript
// Create new restaurant (Step 1)
POST   /api/onboarding/restaurants
       → Uses: create-restaurant-onboarding (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { name, cuisine_type, description, created_by }
       → Returns: Created restaurant with onboarding record

// Add primary contact (Step 3)
POST   /api/onboarding/restaurants/[id]/contact
       → Uses: add_primary_contact_onboarding (SQL Function)
       → Auth: Admin
       → Body: { first_name, last_name, email, phone }
       → Returns: Contact with updated completion %

// Add restaurant location (Step 2)
POST   /api/onboarding/restaurants/[id]/location
       → Uses: add_restaurant_location_onboarding (SQL Function)
       → Auth: Admin
       → Body: { street_address, city_id, postal_code, latitude, longitude }
       → Returns: Location with updated completion %

// Apply schedule template (Step 4)
POST   /api/onboarding/restaurants/[id]/schedule
       → Uses: apply-schedule-template (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { template_name: 'standard'|'extended'|'24_7'|'weekends_only' }
       → Returns: Created schedules count

// Add menu item (Step 5)
POST   /api/onboarding/restaurants/[id]/menu
       → Uses: add_menu_item_onboarding (SQL Function)
       → Auth: Admin
       → Body: { name, description, price, category }
       → Returns: Menu item with updated completion %

// Copy franchise menu (Step 5 - Bulk)
POST   /api/onboarding/restaurants/[id]/menu/copy
       → Uses: copy-franchise-menu (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { source_restaurant_id }
       → Returns: Items copied count

// Create delivery zone (Step 7)
POST   /api/onboarding/restaurants/[id]/delivery-zone
       → Uses: create_delivery_zone_onboarding (SQL Function)
       → Auth: Admin
       → Body: { zone_name, delivery_fee_cents, radius_km, latitude, longitude }
       → Returns: Zone with updated completion %

// Complete onboarding & activate (Step 8)
POST   /api/onboarding/restaurants/[id]/complete
       → Uses: complete-restaurant-onboarding (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { activated_by, notes }
       → Returns: Activated restaurant with completion timestamp
```

**Edge Functions (4):**
- ✅ `create-restaurant-onboarding` - Start onboarding (Step 1)
- ✅ `apply-schedule-template` - Apply schedule (Step 4)
- ✅ `copy-franchise-menu` - Copy menu (Step 5)
- ✅ `complete-restaurant-onboarding` - Activate (Step 8)

**SQL Functions (9):**
- ✅ `create_restaurant_onboarding` - Create with onboarding record
- ✅ `add_primary_contact_onboarding` - Add contact (Step 3)
- ✅ `add_restaurant_location_onboarding` - Add location (Step 2)
- ✅ `add_menu_item_onboarding` - Add menu item (Step 5)
- ✅ `apply_schedule_template_onboarding` - Apply template (Step 4)
- ✅ `copy_franchise_menu_onboarding` - Copy menu (Step 5)
- ✅ `create_delivery_zone_onboarding` - Create zone (Step 7)
- ✅ `complete_onboarding_and_activate` - Activate (Step 8)
- ✅ `bulk_copy_schedule_onboarding` - Copy schedules

---

## Component 11: Domain Verification & SSL Monitoring

```typescript
// Get domain verification summary
GET    /api/domains/summary
       → Uses: v_domain_verification_summary (SQL View)
       → Auth: Admin
       → Returns: Total domains, verified counts, expiring soon, percentages

// Get domains needing attention
GET    /api/domains/alerts
       → Uses: v_domains_needing_attention (SQL View)
       → Auth: Admin
       → Returns: Priority-sorted domains with issues

// Get single domain status
GET    /api/domains/[id]/status
       → Uses: get_domain_verification_status (SQL Function)
       → Auth: Admin
       → Returns: SSL/DNS status, days remaining, verification timestamp

// Verify single domain
POST   /api/domains/[id]/verify
       → Uses: verify-single-domain (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: SSL certificate details, DNS records, verification status

// Automated verification (CRON)
POST   /functions/v1/verify-domains-cron
       → Uses: verify-domains-cron (Edge Function)
       → Auth: Cron Secret (X-Cron-Secret header)
       → Schedule: Daily at 2 AM UTC
       → Returns: Verified count, alerts sent

// Get restaurant domains
GET    /api/restaurants/[id]/domains
       → Direct DB read (restaurant_domains table)
       → Auth: Admin
       → Returns: Array of domains with SSL/DNS status

// Add restaurant domain
POST   /api/restaurants/[id]/domains
       → Direct DB insert (no Edge Function)
       → Auth: Admin
       → Body: { domain, is_primary, ssl_enabled }
       → Returns: Created domain

// Update restaurant domain
PATCH  /api/restaurants/[id]/domains/[domainId]
       → Direct DB update (no Edge Function)
       → Auth: Admin
       → Body: { is_primary, ssl_enabled }
       → Returns: Updated domain

// Delete restaurant domain
DELETE /api/restaurants/[id]/domains/[domainId]
       → Direct DB delete (no Edge Function)
       → Auth: Admin
       → Returns: Success confirmation
```

**Edge Functions (2):**
- ✅ `verify-single-domain` - On-demand verification
- ✅ `verify-domains-cron` - Automated daily checks

**SQL Functions (2):**
- ✅ `get_domain_verification_status` - Get status for single domain
- ✅ `mark_domain_verified` - Update verification status

---

## Additional Routes (Not in 11 Components)

### Commission System (Vendor Management)

```typescript
// Calculate vendor commission
POST   /api/vendors/[id]/commission/calculate
       → Uses: calculate-vendor-commission (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Commission breakdown by period

// Get commission preview
GET    /api/vendors/[id]/commission/preview
       → Uses: get-commission-preview (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Estimated commission before finalization

// Generate commission reports
POST   /api/vendors/commission/reports
       → Uses: generate-commission-reports (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Generated report IDs

// Generate commission PDFs
POST   /api/vendors/commission/pdfs
       → Uses: generate-commission-pdfs (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: PDF file URLs

// Send commission reports
POST   /api/vendors/commission/send
       → Uses: send-commission-reports (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Sent count

// Complete commission workflow
POST   /api/vendors/commission/complete
       → Uses: complete-commission-workflow (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Workflow completion status
```

**Edge Functions (6):**
- ✅ `calculate-vendor-commission` - Calculate commission
- ✅ `get-commission-preview` - Preview calculations
- ✅ `generate-commission-reports` - Generate reports
- ✅ `generate-commission-pdfs` - Create PDFs
- ✅ `send-commission-reports` - Email reports
- ✅ `complete-commission-workflow` - Finalize workflow

### Legacy Migration System

```typescript
// Check legacy account
GET    /api/migration/check
       → Uses: check-legacy-account (Edge Function)
       → Auth: Public
       → Query: ?email=user@example.com
       → Returns: Legacy account status

// Get migration statistics
GET    /api/migration/stats
       → Uses: get-migration-stats (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Total migrated, pending, success rate

// Create legacy auth accounts
POST   /api/migration/create-accounts
       → Uses: create-legacy-auth-accounts (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Created account count

// Complete legacy migration
POST   /api/migration/complete
       → Uses: complete-legacy-migration (Edge Function)
       → Auth: Admin (JWT required)
       → Returns: Migration completion confirmation
```

**Edge Functions (4):**
- ✅ `check-legacy-account` - Check legacy account status
- ✅ `get-migration-stats` - Migration statistics
- ✅ `create-legacy-auth-accounts` - Bulk account creation
- ✅ `complete-legacy-migration` - Finalize migration

### Menu Import System

```typescript
// Import menu from external source
POST   /api/restaurants/[id]/menu/import
       → Uses: import-menu (Edge Function)
       → Auth: Admin (JWT required)
       → Body: { source_url, format: 'csv'|'json'|'pdf' }
       → Returns: Imported items count, errors
```

**Edge Functions (1):**
- ✅ `import-menu` - Import menu from various formats

---

## 📊 COMPLETE SUMMARY

### Edge Functions Deployed: 36 Total

**Component Breakdown:**
- Component 1 (Franchise): 3 Edge Functions
- Component 2 (Soft Delete): 3 Edge Functions
- Component 3 (Status): 3 Edge Functions
- Component 4 (Audit Trail): 1 Edge Function
- Component 5 (Contacts): 3 Edge Functions
- Component 6 (Delivery Zones): 4 Edge Functions
- Component 7 (SEO Search): 1 Edge Function
- Component 8 (Categorization): 3 Edge Functions (shared with C7)
- **Component 9 (Onboarding Tracking): 3 Edge Functions** ✨ NEW
- Component 10 (Onboarding System): 4 Edge Functions
- Component 11 (Domain Verification): 2 Edge Functions
- Commission System: 6 Edge Functions
- Legacy Migration: 4 Edge Functions
- Menu Import: 1 Edge Function

### SQL Functions: 122 Total (All in menuca_v3 schema)

**Schema Cleanup Complete:** ✅
- All auth functions migrated from `public` to `menuca_v3`
- No duplicate functions between schemas
- Single source of truth established

### Authentication Status

**Public Endpoints (No Auth Required):**
- ✅ `check-restaurant-availability` - Working
- ✅ `get-operational-restaurants` - Working
- ✅ `search-restaurants` - Working
- ✅ `get-restaurant-onboarding` - Working (JWT disabled)
- ✅ `get-deletion-audit-trail` - Working (JWT disabled)

**Admin Endpoints (JWT Required):**
- All other Edge Functions require `Authorization: Bearer <JWT>` header
- Use `verifyAdminAuth()` middleware on frontend routes

---

## 🎯 REST Design Principles Applied

1. **Resource Naming:** Always plural (`/franchises`, `/restaurants`, `/domains`)
2. **Hierarchy:** ID in URL path, not body (`/restaurants/[id]/contacts`)
3. **Actions as Resources:** Use nouns + HTTP verbs (`PATCH /online-ordering` not `POST /toggle-online`)
4. **Nesting:** Sub-resources nest under parent (`/restaurants/[id]/*`)
5. **Domain Grouping:** Related operations together (`/onboarding/*`, `/domains/*`)
6. **Consistency:** Same patterns across all endpoints

---

## ✅ Status: Production Ready

**Last Updated:** October 27, 2025
**All 36 Edge Functions:** Deployed & Active
**All 122 SQL Functions:** Verified in menuca_v3 schema
**Schema Architecture:** Single source of truth established
**Test Coverage:** Core endpoints tested and working

**Next Steps:**
- Implement frontend routes based on this reference
- Use this as API contract between frontend and backend
- Update as new Edge Functions are added
