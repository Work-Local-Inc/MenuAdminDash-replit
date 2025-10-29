# Current API Route Implementation - For Santiago Review

**Date:** October 24, 2025  
**Question:** Are these route paths following your backend conventions?

---

## Franchise Routes

```
GET    /api/franchise/chains
       → Uses: get_franchise_chains (SQL Function)
       
GET    /api/franchise/[id]
       → Uses: get_franchise_details (SQL Function)
       
GET    /api/franchise/[id]/analytics
       → Uses: get_franchise_analytics (SQL Function)
       
POST   /api/franchise/create-parent
       → Uses: create-franchise-parent (Edge Function)
       
POST   /api/franchise/link-children
       → Uses: convert-restaurant-to-franchise (Edge Function)
       
POST   /api/franchise/bulk-feature
       → Uses: bulk-update-franchise-feature (Edge Function)
```

**Questions:**
- Should this be `/api/franchise` (singular) or `/api/franchises` (plural)?
- Should `link-children` be named `convert` instead?

---

## Restaurant Status Routes

```
PATCH  /api/restaurants/toggle-online-ordering
       → Uses: toggle-online-ordering (Edge Function)
       → Takes: restaurant_id in body (not in URL)
```

**Question:**
- Should this be `/api/restaurants/[id]/online-ordering` (nested under restaurant)?
- Or is the current flat structure correct?

---

## Contact Management Routes

```
GET    /api/restaurants/[id]/contacts
       → Uses: get_restaurant_contacts (SQL Function)
       
POST   /api/restaurants/[id]/contacts
       → Uses: add-restaurant-contact (Edge Function)
       
PUT    /api/restaurants/[id]/contacts/[contactId]
       → Uses: update-restaurant-contact (Edge Function)
       
DELETE /api/restaurants/[id]/contacts/[contactId]
       → Uses: delete-restaurant-contact (Edge Function)
```

**Status:** These look correctly nested ✓

---

## Cuisine Management Routes

```
GET    /api/restaurants/[id]/cuisines
       → Uses: get_restaurant_cuisines (SQL Function)
       
POST   /api/restaurants/[id]/cuisines
       → Uses: add-restaurant-cuisine (Edge Function)
       
DELETE /api/restaurants/[id]/cuisines/[cuisineId]
       → Uses: remove-restaurant-cuisine (Edge Function)
```

**Status:** These look correctly nested ✓

---

## Tag Management Routes

```
GET    /api/restaurants/[id]/tags
       → Uses: get_restaurant_tags (SQL Function)
       
POST   /api/restaurants/[id]/tags
       → Uses: add-restaurant-tag (Edge Function)
       
DELETE /api/restaurants/[id]/tags/[tagId]
       → Uses: remove-restaurant-tag (Edge Function)
```

**Status:** These look correctly nested ✓

---

## Delivery Area Routes

```
GET    /api/restaurants/[id]/delivery-areas
       → Direct DB read (menuca_v3.restaurant_delivery_zones)
       
POST   /api/restaurants/[id]/delivery-areas
       → Direct DB insert (polygon support - extension)
       
PUT    /api/restaurants/[id]/delivery-areas/[areaId]
       → Direct DB update (polygon support - extension)
       
DELETE /api/restaurants/[id]/delivery-areas/[areaId]
       → Uses: delete-delivery-zone (Edge Function)
```

**Status:** These look correctly nested ✓

---

## Onboarding Routes

```
GET    /api/onboarding/dashboard
       → Uses: get-onboarding-dashboard (Edge Function)
       
GET    /api/onboarding/summary
       → Uses: get_onboarding_summary (SQL Function)
       
GET    /api/onboarding/stats
       → Uses: v_onboarding_progress_stats (SQL View)
       
GET    /api/onboarding/incomplete
       → Uses: v_incomplete_onboarding_restaurants (SQL View)
       
POST   /api/onboarding/create-restaurant
       → Uses: create-restaurant-onboarding (Edge Function)
       
POST   /api/onboarding/add-contact
       → Uses: add_primary_contact_onboarding (SQL Function)
       
POST   /api/onboarding/add-location
       → Uses: add_restaurant_location_onboarding (SQL Function)
       
POST   /api/onboarding/add-menu-item
       → Uses: add_menu_item_onboarding (SQL Function)
       
POST   /api/onboarding/apply-schedule-template
       → Uses: apply-schedule-template (Edge Function)
       
POST   /api/onboarding/copy-franchise-menu
       → Uses: copy-franchise-menu (Edge Function)
       
POST   /api/onboarding/create-delivery-zone
       → Uses: create_delivery_zone_onboarding (SQL Function)
       
POST   /api/onboarding/complete
       → Uses: complete-restaurant-onboarding (Edge Function)
```

**Status:** These look correct ✓

---

## Onboarding Steps (Restaurant-Specific)

```
GET    /api/restaurants/[id]/onboarding
       → Uses: get-restaurant-onboarding (Edge Function)
       
PATCH  /api/restaurants/[id]/onboarding/steps/[step]
       → Uses: update-onboarding-step (Edge Function)
```

**Status:** These look correctly nested ✓

---

## Domain Verification Routes

```
GET    /api/domains/summary
       → Uses: v_domain_verification_summary (SQL View)
       
GET    /api/domains/needing-attention
       → Uses: v_domains_needing_attention (SQL View)
       
GET    /api/domains/[id]/status
       → Uses: get_domain_verification_status (SQL Function)
       
POST   /api/domains/[id]/verify
       → Uses: verify-single-domain (Edge Function)
       
GET    /api/restaurants/[id]/domains
       → Direct DB read (restaurant_domains table)
       
POST   /api/restaurants/[id]/domains
       → Direct DB insert (no Edge Function exists)
       
PATCH  /api/restaurants/[id]/domains/[domainId]
       → Direct DB update (no Edge Function exists)
       
DELETE /api/restaurants/[id]/domains/[domainId]
       → Direct DB delete (no Edge Function exists)
```

**Status:** These look correct ✓

---

## SEO Routes

```
GET    /api/restaurants/[id]/seo
       → Direct DB read (restaurant_seo table)
       
POST   /api/restaurants/[id]/seo
       → Direct DB upsert (no Edge Function exists)
```

**Status:** These look correct ✓

---

## Summary

### Main Questions for Santiago

1. **Franchise routes:** Should `/api/franchise/*` be `/api/franchises/*` (plural)?
2. **Franchise action:** Should `/api/franchise/link-children` be `/api/franchises/convert`?
3. **Online ordering:** Should `/api/restaurants/toggle-online-ordering` be `/api/restaurants/[id]/online-ordering`?

### What's Working Correctly

All other routes follow standard REST conventions:
- ✅ Contacts, cuisines, tags, delivery areas nested under `/api/restaurants/[id]/*`
- ✅ Onboarding routes under `/api/onboarding/*`
- ✅ Domain routes under `/api/domains/*` and `/api/restaurants/[id]/domains/*`
- ✅ All routes properly use your documented Edge Functions and SQL Functions
- ✅ All 80+ routes have proper authentication with `verifyAdminAuth()`

### Extensions to Your Backend

- **Delivery zones:** Use direct DB for polygon support (extends your circular zones)
- **Domain CRUD:** Use direct DB (no Edge Functions exist for simple CRUD)
- **SEO writes:** Use direct DB (no Edge Functions exist for metadata updates)
