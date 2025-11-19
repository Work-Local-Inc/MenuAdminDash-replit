# Restaurant Management Entity - Frontend Developer Guide

**Entity Priority:** 1 (Foundation)  
**Status:** ✅ Complete  
**Last Updated:** 2025-10-21  
**Platform:** Supabase (PostgreSQL + Edge Functions)  
**Project:** nthpbtdjhhnwfxqsxbvy.supabase.co

---

## Purpose

This guide provides frontend developers with complete documentation for the **Restaurant Management Entity**, including:
- 11 complete components with SQL functions and Edge Functions
- API endpoints, request/response formats, and authentication requirements
- Business logic for franchises, delivery zones, onboarding, and more
- Performance benchmarks and usage examples

---

## Quick Reference

### Supabase Client Setup

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nthpbtdjhhnwfxqsxbvy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Calling SQL Functions
```typescript
const { data, error } = await supabase.rpc('function_name', {
  p_param1: value1,
  p_param2: value2
});
```

### Calling Edge Functions
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { field1: value1, field2: value2 }
});
```

---

## Architecture Pattern

**Hybrid SQL + Edge Function Approach:**
- **SQL Functions:** Core business logic, data operations, complex queries (read operations)
- **Edge Functions:** Authentication, authorization, audit logging (write operations)
- **Direct SQL Calls:** Read-only operations, public data, performance-critical queries
- **Edge Wrappers:** Write operations, admin actions, sensitive operations

---

## Component Overview

| Component | Status | SQL Functions | Edge Functions | Guide |
|-----------|--------|---------------|----------------|-------|
| 1. Franchise/Chain Hierarchy | ✅ Complete | 13 | 3 | [View Guide](./Restaurant%20Management/01-Franchise-Chain-Hierarchy.md) |
| 2. Soft Delete Infrastructure | ✅ Complete | 3 | 3 | [View Guide](./Restaurant%20Management/02-Soft-Delete-Infrastructure.md) |
| 3. Status & Online Toggle | ✅ Complete | 3 | 3 | [View Guide](./Restaurant%20Management/03-Status-Online-Toggle.md) |
| 4. Status Audit Trail | ✅ Complete | 2 | 1 | [View Guide](./Restaurant%20Management/04-Status-Audit-Trail.md) |
| 5. Contact Management | ✅ Complete | 1 | 3 | [View Guide](./Restaurant%20Management/05-Contact-Management.md) |
| 6. PostGIS Delivery Zones | ✅ Complete | 8 | 4 | [View Guide](./Restaurant%20Management/06-PostGIS-Delivery-Zones.md) |
| 7. SEO & Full-Text Search | ✅ Complete | 2 | 0 | [View Guide](./Restaurant%20Management/07-SEO-Full-Text-Search.md) |
| 8. Categorization System | ✅ Complete | 3 | 3 | [View Guide](./Restaurant%20Management/08-Categorization-System.md) |
| 9. Onboarding Status Tracking | ✅ Complete | 4 | 3 | [View Guide](./Restaurant%20Management/09-Onboarding-Status-Tracking.md) |
| 10. Restaurant Onboarding System | ✅ Complete | 9 | 4 | [View Guide](./Restaurant%20Management/10-Restaurant-Onboarding-System.md) |
| 11. Domain Verification & SSL | ✅ Complete | 2 | 2 | [View Guide](./Restaurant%20Management/11-Domain-Verification-SSL.md) |

**Total:** 50+ SQL Functions | 29 Edge Functions | All Production-Ready

---

## Component Descriptions

### 1. Franchise/Chain Hierarchy
**Multi-location franchise management system**

Enable management of franchise brands with multiple locations:
- Single dashboard for all franchise locations
- Parent-child restaurant relationships
- Bulk operations across all locations
- Multi-location customer discovery
- Franchise-wide analytics

**Key Features:**
- Create franchise parent brands
- Link restaurants to franchise
- Bulk update franchise features
- Find nearest franchise locations
- Franchise performance analytics

**[📖 Full Documentation →](./Restaurant%20Management/01-Franchise-Chain-Hierarchy.md)**

---

### 2. Soft Delete Infrastructure
**Audit-compliant soft delete system with recovery**

Enable 100% data recovery with complete audit trails:
- 30-day recovery window
- GDPR/CCPA compliance
- Full deletion audit trail
- Zero data loss on accidents
- Historical analysis capability

**Key Features:**
- Soft delete records
- Restore deleted records
- View deletion audit trail
- Automatic recovery window calculation

**[📖 Full Documentation →](./Restaurant%20Management/02-Soft-Delete-Infrastructure.md)**

---

### 3. Status & Online/Offline Toggle
**Restaurant availability and status management**

Manage restaurant operational status and online ordering:
- Emergency shutdown capability
- Temporary closure management
- Real-time availability updates
- Independent online/offline toggle
- Customer-facing status messages

**Key Features:**
- Check restaurant availability
- Toggle online ordering
- Get operational restaurants
- Real-time status updates

**[📖 Full Documentation →](./Restaurant%20Management/03-Status-Online-Toggle.md)**

---

### 4. Status Audit Trail & History
**Complete status change tracking and compliance**

Track all restaurant status changes for compliance:
- Full audit trail for regulators
- Automated status tracking
- Support ticket resolution
- Historical analytics
- Compliance reporting

**Key Features:**
- Get status timeline
- System-wide statistics
- View recent changes
- Update restaurant status (admin)

**[📖 Full Documentation →](./Restaurant%20Management/04-Status-Audit-Trail.md)**

---

### 5. Contact Management & Hierarchy
**Priority-based contact system**

Manage restaurant contacts with role-based hierarchy:
- Priority-based contact hierarchy (primary, secondary, tertiary)
- Role-based communication routing (owner, manager, billing, orders)
- 100% contact coverage with location fallback
- Duplicate prevention
- Multi-contact restaurant support

**Key Features:**
- Get primary contact by type
- Add/update/delete contacts
- Contact info with automatic fallback
- List all restaurant contacts

**[📖 Full Documentation →](./Restaurant%20Management/05-Contact-Management.md)**

---

### 6. PostGIS Delivery Zones & Geospatial
**Geospatial delivery zone management**

Production-ready geospatial delivery system using PostGIS:
- Precise delivery boundaries (polygons, not circles)
- Zone-based pricing (different fees by distance)
- Sub-100ms proximity search
- Instant delivery validation
- Complete zone CRUD operations

**Key Features:**
- Check delivery availability
- Find nearby restaurants
- Zone area analytics
- Create/update/delete zones
- Toggle zone status

**[📖 Full Documentation →](./Restaurant%20Management/06-PostGIS-Delivery-Zones.md)**

---

### 7. SEO Metadata & Full-Text Search
**Restaurant discovery and search optimization**

Production-ready SEO and search system:
- Google-friendly URLs (unique slugs)
- Full-text search (sub-50ms response)
- Relevance ranking (ts_rank algorithm)
- Geospatial integration
- SEO meta tags for organic traffic

**Key Features:**
- Full-text restaurant search
- Get restaurant by SEO slug
- Featured restaurants view
- Search with geospatial filtering

**[📖 Full Documentation →](./Restaurant%20Management/07-SEO-Full-Text-Search.md)**

---

### 8. Restaurant Categorization System
**Tag-based discovery and filtering**

Comprehensive categorization system:
- Cuisine-based search (Pizza, Italian, Chinese, etc.)
- Tag-based filtering (Vegan, Gluten-Free, Late Night, WiFi)
- Multi-cuisine support
- Dietary preference discovery
- Feature-based search

**Key Features:**
- Get restaurant categorization
- Search by cuisine/tags
- Add cuisine to restaurant (admin)
- Add tag to restaurant (admin)
- List available cuisines & tags

**[📖 Full Documentation →](./Restaurant%20Management/08-Categorization-System.md)**

---

### 9. Restaurant Onboarding Status Tracking
**8-step onboarding workflow tracking**

Track restaurant onboarding progress:
- Monitor progress through 8-step process
- Auto-calculated completion percentage
- Identify bottlenecks
- Prioritize support
- Track time-to-activate metrics

**Key Features:**
- Get onboarding status
- Get onboarding summary
- Get incomplete restaurants
- Get step progress stats
- Update onboarding step (admin)

**[📖 Full Documentation →](./Restaurant%20Management/09-Onboarding-Status-Tracking.md)**

---

### 10. Restaurant Onboarding System
**Complete 8-step onboarding lifecycle**

Comprehensive onboarding system with automation:
- Template-based schedules (4 pre-built templates)
- Franchise menu copying (bulk import)
- Smart delivery zone prepopulation
- Progress tracking integration
- Step-by-step validation

**Key Features:**
- Create restaurant (Step 1)
- Add location (Step 2)
- Add contact (Step 3)
- Apply schedule template (Step 4)
- Add menu items / Copy franchise menu (Step 5)
- Create delivery zone (Step 7)
- Complete onboarding & activate (Step 8)

**[📖 Full Documentation →](./Restaurant%20Management/10-Restaurant-Onboarding-System.md)**

---

### 11. Domain Verification & SSL Monitoring
**Automated SSL and DNS monitoring**

Prevent downtime with automated monitoring:
- SSL certificate expiration monitoring
- DNS health checks
- Proactive alerts (30-day warning)
- Centralized dashboard
- On-demand verification

**Key Features:**
- Get domain verification summary
- Get domains needing attention
- Get single domain status
- Verify single domain (admin)
- Automated daily verification (cron)

**[📖 Full Documentation →](./Restaurant%20Management/11-Domain-Verification-SSL.md)**

---

## Quick Start Guide

### For Frontend Developers

1. **Start with Component 1** - Learn franchise management basics
2. **Review Component 3** - Understand status and availability management
3. **Study Component 6** - Master delivery zone functionality
4. **Explore Components 9-10** - Implement restaurant onboarding

### Common Tasks

**Create a Franchise Parent:**
```typescript
await supabase.functions.invoke('create-franchise-parent', {
  body: { name: "Milano Pizza - Corporate", franchise_brand_name: "Milano Pizza" }
});
```

**Check Delivery Availability:**
```typescript
const { data: zone } = await supabase.rpc('is_address_in_delivery_zone', {
  p_restaurant_id: 561,
  p_latitude: 45.4215,
  p_longitude: -75.6972
});
```

**Search Restaurants:**
```typescript
const { data: results } = await supabase.rpc('search_restaurants', {
  p_search_query: 'italian pizza',
  p_latitude: 45.4215,
  p_longitude: -75.6972,
  p_radius_km: 5
});
```

**Toggle Online Ordering:**
```typescript
await supabase.functions.invoke('toggle-online-ordering', {
  body: {
    restaurant_id: 948,
    enabled: false,
    reason: 'Equipment repair - oven malfunction'
  }
});
```

---

## Performance Benchmarks

| Operation Type | Average Response Time | Notes |
|----------------|----------------------|-------|
| SQL Functions (Read) | < 50ms | Most < 20ms |
| Edge Functions (Write) | < 100ms | Includes auth + logging |
| PostGIS Spatial Queries | < 100ms | With GIST indexes |
| Full-Text Search | < 50ms | 17x faster than LIKE |
| Real-Time Updates | ~50-100ms | WebSocket latency |

---

## Security Architecture

**Row-Level Security (RLS):**
- ✅ All tables protected with RLS policies
- ✅ Customers can only see their own data
- ✅ Admins can only access assigned restaurants
- ✅ Service role has full access for admin operations

**Authentication:**
- ✅ JWT-based authentication via Supabase Auth
- ✅ Automatic token refresh (1-hour expiration)
- ✅ MFA support for restaurant admins (TOTP 2FA)
- ✅ Role-based access control (RBAC)

---

## Component Navigation

| Component | Lines | Size | Complexity |
|-----------|-------|------|------------|
| [1. Franchise/Chain Hierarchy](./Restaurant%20Management/01-Franchise-Chain-Hierarchy.md) | 692 | Medium | ⭐⭐⭐ |
| [2. Soft Delete Infrastructure](./Restaurant%20Management/02-Soft-Delete-Infrastructure.md) | 312 | Small | ⭐⭐ |
| [3. Status & Online Toggle](./Restaurant%20Management/03-Status-Online-Toggle.md) | 369 | Small | ⭐⭐ |
| [4. Status Audit Trail](./Restaurant%20Management/04-Status-Audit-Trail.md) | 320 | Small | ⭐⭐ |
| [5. Contact Management](./Restaurant%20Management/05-Contact-Management.md) | 553 | Medium | ⭐⭐ |
| [6. PostGIS Delivery Zones](./Restaurant%20Management/06-PostGIS-Delivery-Zones.md) | 1,489 | Large | ⭐⭐⭐⭐ |
| [7. SEO & Full-Text Search](./Restaurant%20Management/07-SEO-Full-Text-Search.md) | 374 | Small | ⭐⭐ |
| [8. Categorization System](./Restaurant%20Management/08-Categorization-System.md) | 516 | Medium | ⭐⭐⭐ |
| [9. Onboarding Status Tracking](./Restaurant%20Management/09-Onboarding-Status-Tracking.md) | 554 | Medium | ⭐⭐⭐ |
| [10. Restaurant Onboarding System](./Restaurant%20Management/10-Restaurant-Onboarding-System.md) | 579 | Medium | ⭐⭐⭐⭐ |
| [11. Domain Verification & SSL](./Restaurant%20Management/11-Domain-Verification-SSL.md) | 411 | Small | ⭐⭐ |

**Total Documentation:** 6,169 lines across 11 guides

---

## Need Help?

**Can't find something?**
1. Check this index first
2. Open the relevant component guide from the table above
3. Use Ctrl+F to search within component guides
4. Check the [Backend Reference](../../Database/Restaurant%20Management%20Entity/)

**Found an issue?**
- Report bugs/unclear docs in GitHub Issues
- Tag @Santiago for backend questions
- Tag @Brian for frontend questions
- Suggest improvements in Slack

---

**Last Updated:** October 21, 2025  
**Status:** Production-Ready ✅  
**Total Components:** 11  
**Total SQL Functions:** 50+  
**Total Edge Functions:** 29
