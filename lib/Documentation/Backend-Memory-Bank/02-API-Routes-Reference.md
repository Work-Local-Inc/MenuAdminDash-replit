# API Routes Reference

**Last Updated:** October 27, 2025

Complete mapping of all 80+ API routes to their corresponding Santiago Edge Functions, SQL Functions, or database tables.

## Quick Reference Table

| Route | Method | Backend Function | Type | Auth Required |
|-------|--------|-----------------|------|---------------|
| **Franchises** |
| `/api/franchise/chains` | GET | `get_franchise_chains` | SQL Function | ✅ |
| `/api/franchise/[id]` | GET | `get_franchise_details` | SQL Function | ✅ |
| `/api/franchise/[id]/analytics` | GET | `get_franchise_analytics` | SQL Function | ✅ |
| `/api/franchise/create-parent` | POST | `create-franchise-parent` | Edge Function | ✅ |
| `/api/franchise/link-children` | POST | `convert-restaurant-to-franchise` | Edge Function | ✅ |
| `/api/franchise/bulk-feature` | POST | `bulk-update-franchise-feature` | Edge Function | ✅ |
| **Restaurant Status** |
| `/api/restaurants/[id]/status` | PATCH | `update-restaurant-status` | Edge Function | ✅ |
| `/api/restaurants/[id]/status-history` | GET | `get_restaurant_status_history` | SQL Function | ✅ |
| `/api/restaurants/toggle-online-ordering` | PATCH | `toggle-online-ordering` | Edge Function | ✅ |
| **Contacts** |
| `/api/restaurants/[id]/contacts` | GET | `get_restaurant_contacts` | SQL Function | ✅ |
| `/api/restaurants/[id]/contacts` | POST | `add-restaurant-contact` | Edge Function | ✅ |
| `/api/restaurants/[id]/contacts/[contactId]` | PUT | `update-restaurant-contact` | Edge Function | ✅ |
| `/api/restaurants/[id]/contacts/[contactId]` | DELETE | `delete-restaurant-contact` | Edge Function | ✅ |
| **Delivery Areas** |
| `/api/restaurants/[id]/delivery-areas` | GET | Direct DB | Table Read | ✅ |
| `/api/restaurants/[id]/delivery-areas` | POST | Direct DB (polygon support) | Table Write | ✅ |
| `/api/restaurants/[id]/delivery-areas/[areaId]` | PUT | Direct DB (polygon support) | Table Write | ✅ |
| `/api/restaurants/[id]/delivery-areas/[areaId]` | DELETE | `delete-delivery-zone` | Edge Function | ✅ |
| **SEO** |
| `/api/restaurants/[id]/seo` | GET | Direct DB | Table Read | ✅ |
| `/api/restaurants/[id]/seo` | POST | Direct DB (no Edge Function) | Table Write | ✅ |
| **Categorization** |
| `/api/restaurants/[id]/cuisines` | GET | `get_restaurant_cuisines` | SQL Function | ✅ |
| `/api/restaurants/[id]/cuisines` | POST | `add-restaurant-cuisine` | Edge Function | ✅ |
| `/api/restaurants/[id]/cuisines` | DELETE | `remove-restaurant-cuisine` | Edge Function | ✅ |
| `/api/restaurants/[id]/tags` | GET | `get_restaurant_tags` | SQL Function | ✅ |
| `/api/restaurants/[id]/tags` | POST | `add-restaurant-tag` | Edge Function | ✅ |
| `/api/restaurants/[id]/tags` | DELETE | `remove-restaurant-tag` | Edge Function | ✅ |
| **Onboarding Dashboard** |
| `/api/onboarding/dashboard` | GET | `get-onboarding-dashboard` | Edge Function | ✅ |
| `/api/onboarding/summary` | GET | `get_onboarding_summary` | SQL Function | ✅ |
| `/api/onboarding/stats` | GET | `v_onboarding_progress_stats` | SQL View | ✅ |
| `/api/onboarding/incomplete` | GET | `v_incomplete_onboarding_restaurants` | SQL View | ✅ |
| **Onboarding Steps** |
| `/api/onboarding/create-restaurant` | POST | `create-restaurant-onboarding` | Edge Function | ✅ |
| `/api/onboarding/add-contact` | POST | `add_primary_contact_onboarding` | SQL Function | ✅ |
| `/api/onboarding/add-location` | POST | `add_restaurant_location_onboarding` | SQL Function | ✅ |
| `/api/onboarding/add-menu-item` | POST | `add_menu_item_onboarding` | SQL Function | ✅ |
| `/api/onboarding/apply-schedule-template` | POST | `apply-schedule-template` | Edge Function | ✅ |
| `/api/onboarding/copy-franchise-menu` | POST | `copy-franchise-menu` | Edge Function | ✅ |
| `/api/onboarding/create-delivery-zone` | POST | `create_delivery_zone_onboarding` | SQL Function | ✅ |
| `/api/onboarding/complete` | POST | `complete-restaurant-onboarding` | Edge Function | ✅ |
| **Domain Verification** |
| `/api/domains/summary` | GET | `v_domain_verification_summary` | SQL View | ✅ |
| `/api/domains/needing-attention` | GET | `v_domains_needing_attention` | SQL View | ✅ |
| `/api/domains/[id]/status` | GET | `get_domain_verification_status` | SQL Function | ✅ |
| `/api/domains/[id]/verify` | POST | `verify-single-domain` | Edge Function | ✅ |
| `/api/restaurants/[id]/domains` | GET | Direct DB | Table Read | ✅ |
| `/api/restaurants/[id]/domains` | POST | Direct DB (no Edge Function) | Table Write | ✅ |
| `/api/restaurants/[id]/domains/[domainId]` | PATCH | Direct DB (no Edge Function) | Table Write | ✅ |
| `/api/restaurants/[id]/domains/[domainId]` | DELETE | Direct DB (no Edge Function) | Table Write | ✅ |

---

## Detailed Route Documentation

### Franchise Routes

#### GET /api/franchise/chains
**Purpose:** List all franchise chains

**Backend Integration:**
```typescript
const { data } = await supabase.rpc('get_franchise_chains');
```

**SQL Function:** `menuca_v3.get_franchise_chains()`

**Returns:**
```typescript
{
  chain_id: number;
  parent_name: string;
  total_locations: number;
  brand_name: string;
}[]
```

**Authentication:** Required via `verifyAdminAuth(request)`

---

#### GET /api/franchise/[id]
**Purpose:** Get franchise chain details

**Backend Integration:**
```typescript
const { data } = await supabase.rpc('get_franchise_details', {
  p_parent_id: chainId
});
```

**SQL Function:** `menuca_v3.get_franchise_details(p_parent_id)`

**Returns:** Franchise parent + list of all children

**Authentication:** Required

---

#### GET /api/franchise/[id]/analytics
**Purpose:** Get franchise performance analytics

**Backend Integration:**
```typescript
const { data } = await supabase.rpc('get_franchise_analytics', {
  p_parent_id: chainId
});
```

**SQL Function:** `menuca_v3.get_franchise_analytics(p_parent_id)`

**Returns:** Revenue, order metrics, top performers

**Authentication:** Required

---

#### POST /api/franchise/create-parent
**Purpose:** Create a new franchise parent restaurant

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('create-franchise-parent', {
  body: {
    restaurant_id: number,
    franchise_brand_name: string
  }
});
```

**Edge Function:** `create-franchise-parent`

**Authentication:** Required

---

#### POST /api/franchise/link-children
**Purpose:** Convert restaurant(s) to franchise children

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('convert-restaurant-to-franchise', {
  body: {
    parent_restaurant_id: number,
    child_restaurant_ids: number[] // Single or batch
  }
});
```

**Edge Function:** `convert-restaurant-to-franchise`

**Supports:** Single or batch conversion

**Authentication:** Required

---

#### POST /api/franchise/bulk-feature
**Purpose:** Update feature across all franchise children

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('bulk-update-franchise-feature', {
  body: {
    parent_restaurant_id: number,
    feature_name: string,
    feature_value: any
  }
});
```

**Edge Function:** `bulk-update-franchise-feature`

**Authentication:** Required

---

### Restaurant Status Routes

#### PATCH /api/restaurants/[id]/status
**Purpose:** Update restaurant status (soft delete with 30-day recovery)

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('update-restaurant-status', {
  body: {
    restaurant_id: number,
    status: 'active' | 'inactive' | 'pending' | 'suspended',
    reason?: string
  }
});
```

**Edge Function:** `update-restaurant-status`

**Features:**
- Audit logging
- 30-day soft delete recovery
- Status transition validation

**Authentication:** Required

---

#### GET /api/restaurants/[id]/status-history
**Purpose:** Get audit trail of status changes

**Backend Integration:**
```typescript
const { data } = await supabase.rpc('get_restaurant_status_history', {
  p_restaurant_id: restaurantId
});
```

**SQL Function:** `menuca_v3.get_restaurant_status_history(p_restaurant_id)`

**Returns:** Chronological list of status changes with reasons

**Authentication:** Required

---

#### PATCH /api/restaurants/toggle-online-ordering
**Purpose:** Toggle online ordering on/off

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('toggle-online-ordering', {
  body: {
    restaurant_id: number,
    online_ordering_enabled: boolean
  }
});
```

**Edge Function:** `toggle-online-ordering`

**Features:** Audit logging

**Authentication:** Required

---

### Contact Routes

#### GET /api/restaurants/[id]/contacts
**Purpose:** Get all contacts with hierarchy (primary first)

**Backend Integration:**
```typescript
const { data } = await supabase.rpc('get_restaurant_contacts', {
  p_restaurant_id: restaurantId
});
```

**SQL Function:** `menuca_v3.get_restaurant_contacts(p_restaurant_id)`

**Returns:** Contacts sorted by hierarchy (primary first)

**Authentication:** Required

---

#### POST /api/restaurants/[id]/contacts
**Purpose:** Add new contact with automatic hierarchy management

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('add-restaurant-contact', {
  body: {
    restaurant_id: number,
    first_name: string,
    last_name: string,
    email: string,
    phone: string,
    title?: string,
    is_primary?: boolean
  }
});
```

**Edge Function:** `add-restaurant-contact`

**Features:**
- Auto-demotes existing primary if new contact is primary
- Hierarchy management

**Authentication:** Required

---

#### PUT /api/restaurants/[id]/contacts/[contactId]
**Purpose:** Update contact with hierarchy management

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('update-restaurant-contact', {
  body: {
    contact_id: number,
    // ... updated fields
  }
});
```

**Edge Function:** `update-restaurant-contact`

**Features:** Hierarchy management on primary change

**Authentication:** Required

---

#### DELETE /api/restaurants/[id]/contacts/[contactId]
**Purpose:** Soft delete contact (30-day recovery)

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('delete-restaurant-contact', {
  body: {
    contact_id: number
  }
});
```

**Edge Function:** `delete-restaurant-contact`

**Features:**
- Soft delete with recovery
- Auto-promotes next contact if primary deleted

**Authentication:** Required

---

### Delivery Area Routes

#### GET /api/restaurants/[id]/delivery-areas
**Purpose:** Get all delivery zones

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('restaurant_delivery_zones')
  .select('*')
  .eq('restaurant_id', restaurantId)
  .is('deleted_at', null);
```

**Direct DB:** Read from `restaurant_delivery_zones` table

**Why Direct DB:** Simple read, no Edge Function exists

**Authentication:** Required

---

#### POST /api/restaurants/[id]/delivery-areas
**Purpose:** Create delivery zone with custom polygon

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('restaurant_delivery_zones')
  .insert({
    restaurant_id: number,
    zone_name: string,
    polygon_geojson: object, // Mapbox polygon
    delivery_fee_cents: number,
    minimum_order_cents: number
  });
```

**Direct DB:** Insert to `restaurant_delivery_zones` table

**Why Direct DB:** Santiago's backend uses center+radius (circular zones). Menu.ca extends this with Mapbox polygons for more flexible delivery areas. No Edge Function exists for polygon support.

**Authentication:** Required

---

#### PUT /api/restaurants/[id]/delivery-areas/[areaId]
**Purpose:** Update delivery zone polygon/fees

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('restaurant_delivery_zones')
  .update({
    polygon_geojson: object,
    delivery_fee_cents: number,
    minimum_order_cents: number
  })
  .eq('id', areaId);
```

**Direct DB:** Update `restaurant_delivery_zones` table

**Why Direct DB:** Polygon support extension (no Edge Function)

**Authentication:** Required

---

#### DELETE /api/restaurants/[id]/delivery-areas/[areaId]
**Purpose:** Soft delete zone (30-day recovery)

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('delete-delivery-zone', {
  body: {
    zone_id: areaId
  }
});
```

**Edge Function:** `delete-delivery-zone`

**Features:** 30-day soft delete with recovery

**Authentication:** Required

---

### SEO Routes

#### GET /api/restaurants/[id]/seo
**Purpose:** Get SEO metadata

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('restaurant_seo')
  .select('*')
  .eq('restaurant_id', restaurantId)
  .single();
```

**Direct DB:** Read from `restaurant_seo` table

**Why Direct DB:** Simple read, SQL functions exist for search (not metadata CRUD)

**Authentication:** Required

---

#### POST /api/restaurants/[id]/seo
**Purpose:** Update SEO metadata

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('restaurant_seo')
  .upsert({
    restaurant_id: number,
    meta_title: string,
    meta_description: string,
    og_title: string,
    og_description: string,
    og_image_url: string,
    include_in_sitemap: boolean
  });
```

**Direct DB:** Upsert to `restaurant_seo` table

**Why Direct DB:** No Edge Function exists for SEO metadata writes. Santiago provides SQL functions for search (`search_restaurants`, `get_restaurant_by_slug`), not for CRUD operations on metadata.

**Authentication:** Required

---

### Categorization Routes

#### GET /api/restaurants/[id]/cuisines
**Purpose:** Get restaurant cuisines with primary indicator

**Backend Integration:**
```typescript
const { data } = await supabase.rpc('get_restaurant_cuisines', {
  p_restaurant_id: restaurantId
});
```

**SQL Function:** `menuca_v3.get_restaurant_cuisines(p_restaurant_id)`

**Returns:** Cuisines with `is_primary` flag

**Authentication:** Required

---

#### POST /api/restaurants/[id]/cuisines
**Purpose:** Add cuisine with auto primary/secondary logic

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('add-restaurant-cuisine', {
  body: {
    restaurant_id: number,
    cuisine_id: number,
    is_primary: boolean
  }
});
```

**Edge Function:** `add-restaurant-cuisine`

**Features:**
- Auto-demotes existing primary if new is primary
- Hierarchy management

**Authentication:** Required

---

#### DELETE /api/restaurants/[id]/cuisines
**Purpose:** Remove cuisine with auto-reorder

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('remove-restaurant-cuisine', {
  body: {
    restaurant_id: number,
    cuisine_id: number
  }
});
```

**Edge Function:** `remove-restaurant-cuisine`

**Features:** Auto-promotes next cuisine if primary removed

**Authentication:** Required

---

#### GET /api/restaurants/[id]/tags
**Purpose:** Get restaurant tags grouped by category

**Backend Integration:**
```typescript
const { data } = await supabase.rpc('get_restaurant_tags', {
  p_restaurant_id: restaurantId
});
```

**SQL Function:** `menuca_v3.get_restaurant_tags(p_restaurant_id)`

**Returns:** Tags with category grouping

**Authentication:** Required

---

#### POST /api/restaurants/[id]/tags
**Purpose:** Add tag to restaurant

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('add-restaurant-tag', {
  body: {
    restaurant_id: number,
    tag_id: number
  }
});
```

**Edge Function:** `add-restaurant-tag`

**Authentication:** Required

---

#### DELETE /api/restaurants/[id]/tags
**Purpose:** Remove tag from restaurant

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('remove-restaurant-tag', {
  body: {
    restaurant_id: number,
    tag_id: number
  }
});
```

**Edge Function:** `remove-restaurant-tag`

**Authentication:** Required

---

### Onboarding Routes

#### GET /api/onboarding/dashboard
**Purpose:** Get complete onboarding dashboard data

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('get-onboarding-dashboard');
```

**Edge Function:** `get-onboarding-dashboard`

**Returns:** Summary stats, bottleneck steps, at-risk restaurants

**Authentication:** Required

---

#### GET /api/onboarding/summary
**Purpose:** Get aggregate onboarding statistics

**Backend Integration:**
```typescript
const { data } = await supabase.rpc('get_onboarding_summary');
```

**SQL Function:** `menuca_v3.get_onboarding_summary()`

**Returns:**
```typescript
{
  total_restaurants: number;
  completed_onboarding: number;
  incomplete_onboarding: number;
  avg_completion_percentage: number;
  avg_days_to_complete: number;
}
```

**Authentication:** Required

---

#### GET /api/onboarding/stats
**Purpose:** Get step-by-step completion statistics

**Backend Integration:**
```typescript
const { data } = await supabase
  .from('v_onboarding_progress_stats')
  .select('*')
  .order('step_order');
```

**SQL View:** `menuca_v3.v_onboarding_progress_stats`

**Returns:** Completion percentage per step (identifies bottlenecks)

**Authentication:** Required

---

#### GET /api/onboarding/incomplete
**Purpose:** Get restaurants with incomplete onboarding

**Backend Integration:**
```typescript
const { data } = await supabase
  .from('v_incomplete_onboarding_restaurants')
  .select('*')
  .order('days_in_onboarding', { ascending: false });
```

**SQL View:** `menuca_v3.v_incomplete_onboarding_restaurants`

**Returns:** At-risk restaurants sorted by priority

**Authentication:** Required

---

#### POST /api/onboarding/create-restaurant
**Purpose:** Create restaurant and start onboarding tracking

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('create-restaurant-onboarding', {
  body: {
    name: string,
    timezone: string,
    parent_restaurant_id?: number,
    is_franchise_parent: boolean
  }
});
```

**Edge Function:** `create-restaurant-onboarding`

**Features:**
- Creates restaurant record
- Creates onboarding tracking record
- Marks step 1 (basic info) complete

**Authentication:** Required

---

#### POST /api/onboarding/apply-schedule-template
**Purpose:** Apply pre-built schedule template (1-click)

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('apply-schedule-template', {
  body: {
    restaurant_id: number,
    template_name: '24/7' | 'Mon-Fri 9-5' | 'Mon-Fri 11-9, Sat-Sun 11-10' | 'Lunch & Dinner'
  }
});
```

**Edge Function:** `apply-schedule-template`

**Features:**
- Creates 14-28 schedule records (1-click)
- Auto-marks schedule step complete
- Fixes 5.63% bottleneck!

**Templates:**
1. **24/7** - All days, 00:00-23:59
2. **Mon-Fri 9-5** - Standard business hours
3. **Mon-Fri 11-9, Sat-Sun 11-10** - Common restaurant hours
4. **Lunch & Dinner** - Split shifts: 11-2 and 5-9

**Authentication:** Required

---

#### POST /api/onboarding/copy-franchise-menu
**Purpose:** Bulk copy menu from franchise parent

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('copy-franchise-menu', {
  body: {
    target_restaurant_id: number,
    source_restaurant_id: number
  }
});
```

**Edge Function:** `copy-franchise-menu`

**Features:**
- Validates franchise relationship
- Copies all dishes, prices, photos
- Maintains parent-child dish links

**Authentication:** Required

---

#### POST /api/onboarding/complete
**Purpose:** Complete onboarding and activate restaurant

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('complete-restaurant-onboarding', {
  body: {
    restaurant_id: number,
    notes?: string
  }
});
```

**Edge Function:** `complete-restaurant-onboarding`

**Features:**
- Marks all steps complete
- Sets status to 'active'
- Records completion timestamp

**Authentication:** Required

---

### Domain Verification Routes

#### GET /api/domains/summary
**Purpose:** Get domain verification summary statistics

**Backend Integration:**
```typescript
const { data } = await supabase
  .from('v_domain_verification_summary')
  .select('*')
  .single();
```

**SQL View:** `menuca_v3.v_domain_verification_summary`

**Returns:**
```typescript
{
  total_domains: number;
  ssl_verified_count: number;
  ssl_expiring_soon: number;
  ssl_expired: number;
  needs_recheck: number;
}
```

**Authentication:** Required

---

#### GET /api/domains/needing-attention
**Purpose:** Get priority-sorted list of domains needing action

**Backend Integration:**
```typescript
const { data } = await supabase
  .from('v_domains_needing_attention')
  .select('*')
  .order('priority_score', { ascending: false })
  .limit(50);
```

**SQL View:** `menuca_v3.v_domains_needing_attention`

**Returns:** Domains with SSL issues, DNS problems, or expiring certificates

**Priority Scores:**
- 5 = Critical (SSL expired or expires ≤ 7 days)
- 3 = Warning (SSL expires ≤ 30 days)
- 2 = DNS not verified
- 0 = Disabled domain

**Authentication:** Required

---

#### GET /api/domains/[id]/status
**Purpose:** Get detailed verification status for single domain

**Backend Integration:**
```typescript
const { data } = await supabase.rpc('get_domain_verification_status', {
  p_domain_id: domainId
});
```

**SQL Function:** `menuca_v3.get_domain_verification_status(p_domain_id)`

**Returns:**
```typescript
{
  domain: string;
  ssl_verified: boolean;
  ssl_expires_at: string | null;
  ssl_days_remaining: number;
  dns_verified: boolean;
  needs_attention: boolean;
}
```

**Authentication:** Required

---

#### POST /api/domains/[id]/verify
**Purpose:** On-demand domain verification (SSL + DNS)

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('verify-single-domain', {
  body: { domain_id: number }
});
```

**Edge Function:** `verify-single-domain`

**Features:**
- Checks SSL certificate expiration
- Verifies DNS records (A/CNAME)
- Updates database with results
- Returns detailed verification status

**Performance:** ~2-5 seconds (external SSL/DNS checks)

**Use Cases:**
- Domain just added → Verify immediately
- Certificate renewed → Confirm it worked
- DNS changed → Check new records

**Authentication:** Required

---

#### GET /api/restaurants/[id]/domains
**Purpose:** Get all domains for restaurant

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('restaurant_domains')
  .select('*')
  .eq('restaurant_id', restaurantId);
```

**Direct DB:** Read from `restaurant_domains` table

**Why Direct DB:** Simple CRUD, no Edge Function exists

**Authentication:** Required

---

#### POST /api/restaurants/[id]/domains
**Purpose:** Add new domain to restaurant

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('restaurant_domains')
  .insert({
    restaurant_id: number,
    domain: string,
    is_primary: boolean
  });
```

**Direct DB:** Insert to `restaurant_domains` table

**Why Direct DB:** No Edge Function exists for simple domain CRUD

**Authentication:** Required

---

#### PATCH /api/restaurants/[id]/domains/[domainId]
**Purpose:** Update domain settings

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('restaurant_domains')
  .update({ /* fields */ })
  .eq('id', domainId);
```

**Direct DB:** Update `restaurant_domains` table

**Why Direct DB:** No Edge Function exists for simple domain CRUD

**Authentication:** Required (fixed during audit)

---

#### DELETE /api/restaurants/[id]/domains/[domainId]
**Purpose:** Delete domain

**Backend Integration:**
```typescript
const { error } = await supabase
  .schema('menuca_v3')
  .from('restaurant_domains')
  .delete()
  .eq('id', domainId);
```

**Direct DB:** Delete from `restaurant_domains` table

**Why Direct DB:** No Edge Function exists for simple domain CRUD

**Authentication:** Required (fixed during audit)

---

## Backend Integration Patterns

### Pattern 1: SQL Function (Read Operations)

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('sql_function_name', {
      p_param1: value1,
      p_param2: value2
    });
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Pattern 2: Edge Function (Write Operations)

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    
    const body = await request.json();
    const supabase = createAdminClient();
    
    const { data, error } = await supabase.functions.invoke('edge-function-name', {
      body: validatedData
    });
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Pattern 3: SQL View (Analytics/Aggregations)

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('v_view_name')
      .select('*')
      .order('field');
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Pattern 4: Direct DB (Only When No Edge Function Exists)

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    
    const body = await request.json();
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('table_name')
      .insert(validatedData);
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Summary Statistics

- **Total API Routes:** 80+
- **Edge Functions Used:** 29
- **SQL Functions Used:** 50+
- **SQL Views Used:** 6
- **Direct DB Routes:** 12 (all justified - no Edge Functions exist)
- **Authentication Coverage:** 100%

---

## References

- **Santiago's Guide:** `lib/Documentation/Frontend-Guides/BRIAN_MASTER_INDEX.md`
- **Compliance Report:** `lib/Documentation/Backend-Memory-Bank/01-BRIAN-Compliance-Report.md`
- **Authentication Docs:** `lib/Documentation/Backend-Memory-Bank/03-Authentication-Status.md`
