## Component 1: Franchise/Chain Hierarchy

**Status:** ✅ **COMPLETE** (100%)  
**Last Updated:** 2025-10-17

### Business Purpose

Enable management of franchise brands with multiple locations:
- Single dashboard for all franchise locations
- Parent-child restaurant relationships
- Bulk operations across all locations
- Multi-location customer discovery
- Franchise-wide analytics

### Production Data
- 19 franchise parent brands
- 97 franchise child locations
- Largest: Milano Pizza (48 locations)

---

## Business Logic & Rules

### Logic 1: Creating Franchise Parents

**Business Logic:**
```
New franchise brand wants to join platform
├── Step 1: Create parent restaurant record
│   ├── Set is_franchise_parent = true
│   ├── Set franchise_brand_name = "Brand Name"
│   ├── Populate basic info (address, phone, email)
│   └── Status = 'active' (parent always active)
│
├── Step 2: Parent gets unique ID (e.g., 986)
│   └── This ID used to link all child locations
│
└── Step 3: Parent visible in admin dashboard
    └── Ready to add child locations

Decision Tree:
1. Is this a franchise/chain?
   NO → Create as independent restaurant
   YES → Continue to step 2

2. Does parent record exist?
   YES → Use existing parent_id
   NO → Create parent first

3. How many locations?
   1 location → Independent (no parent needed)
   2+ locations → Create parent + children
```

**Validation Rules:**
- ✅ `franchise_brand_name` required if `is_franchise_parent = true`
- ✅ Parent cannot have `parent_restaurant_id` (must be null)
- ✅ Parent must have valid contact info
- ✅ `is_franchise_parent = true` is immutable (can't change after creation)

---

### Logic 2: Linking Children to Parents

**Business Logic:**
```
Existing restaurant becomes franchise location
├── Step 1: Identify all locations belonging to brand
│   └── Example: 48 Milano restaurants (IDs: 3,7,11,...)
│
├── Step 2: Update each location's parent_restaurant_id
│   ├── SET parent_restaurant_id = 986
│   └── Child restaurants keep their own:
│       ├── Unique ID
│       ├── Name (can be different from parent)
│       ├── Address (different locations)
│       ├── Status (active/suspended/pending)
│       └── Operational details
│
└── Step 3: Verify relationship
    ├── Child count matches expected
    ├── No orphaned children
    └── No circular references

Inheritance Model:
├── Children INHERIT from parent:
│   ├── Brand name
│   ├── Logo/imagery (future)
│   ├── Menu template (future)
│   └── Feature flags (future)
│
└── Children KEEP their own:
    ├── Physical address
    ├── Operating hours
    ├── Staff/contacts
    ├── Local promotions
    └── Individual status
```

**Safety Checks:**
```typescript
// Check 1: No self-references
const { data: selfRefs } = await supabase.rpc('validate_franchise_hierarchy');
// Expected: 0 issues ✅

// Check 2: All parents exist (no orphaned children)
// Check 3: No circular references (depth check)
```

---

### Logic 3: Brand Management

**Business Logic:**
```
Franchise brand controls all locations
├── Parent Dashboard Shows:
│   ├── Total locations: 48
│   ├── Active locations: 43
│   ├── Pending setup: 0
│   ├── Suspended: 5
│   └── Geographic distribution: 24 ON, 24 AB
│
├── Bulk Operations Available:
│   ├── Update menu across all locations
│   ├── Enable/disable features franchise-wide
│   ├── Set pricing rules for all children
│   └── Apply promotions to all locations
│
└── Reporting & Analytics:
    ├── Aggregate revenue across all locations
    ├── Performance comparison by location
    ├── Customer reviews aggregated
    └── Order volume trends by region
```

**Dashboard Query Example:**
```typescript
// Get franchise performance summary
const { data: analytics } = await supabase.rpc('get_franchise_analytics', {
  p_parent_id: 986,  // Milano Pizza
  p_period_days: 30
});

console.log(`Total Revenue: $${analytics.total_revenue}`);
console.log(`Total Orders: ${analytics.total_orders}`);
console.log(`Avg Order Value: $${analytics.avg_order_value}`);
console.log(`Top Performer: ${analytics.top_location_name}`);
```

---

## API Features

### Feature 1.1: Create Franchise Parent

**Purpose:** Create a new franchise brand/parent restaurant

#### SQL Function

```sql
menuca_v3.create_franchise_parent(
  p_name VARCHAR,
  p_franchise_brand_name VARCHAR,
  p_timezone VARCHAR DEFAULT 'America/Toronto',
  p_created_by BIGINT DEFAULT NULL
)
RETURNS TABLE (
  parent_id BIGINT,
  brand_name VARCHAR,
  name VARCHAR,
  status restaurant_status
)
```

#### Edge Function

**Endpoint:** `POST /functions/v1/create-franchise-parent`

**Authentication:** Required (JWT)

**Request:**
```typescript
const { data, error } = await supabase.functions.invoke('create-franchise-parent', {
  body: {
    name: "Milano Pizza - Corporate",
    franchise_brand_name: "Milano Pizza",
    timezone: "America/Toronto",
    created_by: currentUser.id
  }
});
```

**Response:**
```typescript
{
  success: true,
  data: {
    parent_id: 1006,
    brand_name: "Milano Pizza",
    name: "Milano Pizza - Corporate",
    status: "active"
  },
  message: "Franchise parent created successfully"
}
```

**Validation:**
- Brand name must be unique
- Name length: 2-255 characters
- Valid IANA timezone required

**Performance:** ~15ms

---

### Feature 1.2: Link Restaurants to Franchise

**Purpose:** Convert independent restaurant(s) to franchise locations

#### SQL Functions

**Single Conversion:**
```sql
menuca_v3.convert_to_franchise(
  p_restaurant_id BIGINT,
  p_parent_restaurant_id BIGINT,
  p_updated_by BIGINT DEFAULT NULL
)
RETURNS TABLE (
  restaurant_id BIGINT,
  restaurant_name VARCHAR,
  parent_restaurant_id BIGINT,
  parent_brand_name VARCHAR
)
```

**Batch Conversion:**
```sql
menuca_v3.batch_link_franchise_children(
  p_parent_restaurant_id BIGINT,
  p_child_restaurant_ids BIGINT[],
  p_updated_by BIGINT DEFAULT NULL
)
RETURNS TABLE (
  parent_restaurant_id BIGINT,
  parent_brand_name VARCHAR,
  linked_count INTEGER,
  child_restaurants JSONB
)
```

#### Edge Function

**Endpoint:** `POST /functions/v1/convert-restaurant-to-franchise`

**Authentication:** Required (JWT)

**Single Conversion Request:**
```typescript
const { data, error } = await supabase.functions.invoke('convert-restaurant-to-franchise', {
  body: {
    restaurant_id: 561,
    parent_restaurant_id: 1005,
    updated_by: currentUser.id
  }
});
```

**Batch Conversion Request:**
```typescript
const { data, error } = await supabase.functions.invoke('convert-restaurant-to-franchise', {
  body: {
    parent_restaurant_id: 1005,
    child_restaurant_ids: [561, 562, 563, 564],
    updated_by: currentUser.id
  }
});
```

**Response (Batch):**
```typescript
{
  success: true,
  data: {
    parent_restaurant_id: 1005,
    parent_brand_name: "Milano Pizza",
    linked_count: 4,
    child_restaurants: [
      { id: 561, name: "Milano Pizza - Downtown" },
      { id: 562, name: "Milano Pizza - Uptown" },
      // ...
    ]
  },
  message: "Successfully linked 4 restaurants to franchise"
}
```

**Validation:**
- Parent must be a franchise parent (`is_franchise_parent = true`)
- Children must be independent (not already linked)
- All IDs must exist and be active

**Performance:** 
- Single: ~12ms
- Batch (48 locations): ~45ms

---

### Feature 1.3: Bulk Update Franchise Features

**Purpose:** Toggle features across all franchise locations

#### SQL Function

```sql
menuca_v3.bulk_update_franchise_feature(
  p_parent_id BIGINT,
  p_feature_key VARCHAR,
  p_is_enabled BOOLEAN,
  p_updated_by BIGINT
)
RETURNS INTEGER  -- Number of children updated
```

#### Edge Function

**Endpoint:** `POST /functions/v1/bulk-update-franchise-feature`

**Authentication:** Required (JWT)

**Request:**
```typescript
const { data, error } = await supabase.functions.invoke('bulk-update-franchise-feature', {
  body: {
    parent_restaurant_id: 986,
    feature_key: "loyalty_program",
    is_enabled: true,
    updated_by: currentUser.id
  }
});
```

**Response:**
```typescript
{
  success: true,
  data: {
    parent_restaurant_id: 986,
    brand_name: "Milano Pizza",
    feature_key: "loyalty_program",
    is_enabled: true,
    updated_count: 48
  },
  message: "Successfully updated loyalty_program for 48 franchise location(s)"
}
```

**Valid Feature Keys:**
- `online_ordering`
- `delivery`
- `pickup`
- `loyalty_program`
- `reservations`
- `gift_cards`
- `catering`
- `table_booking`

**Use Cases:**
- Emergency shutdown (disable online_ordering across all locations)
- Feature rollout (enable loyalty_program franchise-wide)
- Seasonal changes (enable catering for summer)

**Performance:** ~50-100ms for 48 locations

---

### Feature 1.4: Find Nearest Franchise Locations

**Purpose:** Show customers all franchise locations sorted by distance

#### SQL Function

```sql
menuca_v3.find_nearest_franchise_locations(
  p_parent_id BIGINT,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_max_distance_km NUMERIC DEFAULT 25,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  restaurant_id BIGINT,
  restaurant_name VARCHAR,
  distance_km NUMERIC,
  delivery_available BOOLEAN,
  delivery_fee_cents INTEGER,
  estimated_delivery_minutes INTEGER,
  is_open BOOLEAN,
  location_lat NUMERIC,
  location_lng NUMERIC
)
```

#### Client Usage (Direct SQL Call)

**No Edge Function - Call SQL Directly:**
```typescript
const { data, error } = await supabase.rpc('find_nearest_franchise_locations', {
  p_parent_id: 986,  // Milano Pizza
  p_latitude: 45.4215,
  p_longitude: -75.6972,
  p_max_distance_km: 25,
  p_limit: 5
});
```

**Response:**
```typescript
[
  {
    restaurant_id: 3,
    restaurant_name: "Milano Pizza Downtown",
    distance_km: 1.2,
    delivery_available: true,
    delivery_fee_cents: 299,
    estimated_delivery_minutes: 25,
    is_open: true,
    location_lat: 45.4235,
    location_lng: -75.6950
  },
  {
    restaurant_id: 7,
    restaurant_name: "Milano Pizza West End",
    distance_km: 5.8,
    delivery_available: true,
    delivery_fee_cents: 399,
    estimated_delivery_minutes: 35,
    is_open: true,
    location_lat: 45.3890,
    location_lng: -75.7500
  },
  // ... up to 5 locations
]
```

**How It Works:**
- Uses PostGIS spatial queries for accurate distance calculation
- Checks if customer is in delivery zone (polygon intersection)
- Only returns active restaurants within search radius
- Sorted by distance (closest first)

**Performance:** ~35ms (PostGIS indexed)

**Frontend Display Example:**
```typescript
// Get customer location
const { latitude, longitude } = await getCustomerLocation();

// Find nearest locations
const { data: locations } = await supabase.rpc('find_nearest_franchise_locations', {
  p_parent_id: franchiseId,
  p_latitude: latitude,
  p_longitude: longitude,
  p_max_distance_km: 25,
  p_limit: 5
});

// Display in UI
locations.forEach(location => {
  console.log(`${location.restaurant_name} - ${location.distance_km} km away`);
  if (location.delivery_available) {
    console.log(`Delivers here • $${location.delivery_fee_cents/100} • ${location.estimated_delivery_minutes} min`);
  } else {
    console.log('Pickup only');
  }
});
```

---

### Feature 1.5: Franchise Performance Analytics

**Purpose:** Dashboard analytics for franchise owners

#### SQL Functions

**Executive Summary:**
```sql
menuca_v3.get_franchise_analytics(
  p_parent_id BIGINT,
  p_period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  chain_id BIGINT,
  brand_name VARCHAR,
  period_days INTEGER,
  total_locations INTEGER,
  active_locations INTEGER,
  total_orders BIGINT,
  total_revenue NUMERIC,
  avg_order_value NUMERIC,
  total_customers BIGINT,
  revenue_per_customer NUMERIC,
  top_location_id BIGINT,
  top_location_name VARCHAR,
  top_location_revenue NUMERIC,
  bottom_location_id BIGINT,
  bottom_location_name VARCHAR,
  bottom_location_revenue NUMERIC
)
```

**Location Rankings:**
```sql
menuca_v3.compare_franchise_locations(
  p_parent_id BIGINT,
  p_period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  location_id BIGINT,
  location_name VARCHAR,
  location_city VARCHAR,
  location_status restaurant_status,
  order_count BIGINT,
  revenue NUMERIC,
  avg_order_value NUMERIC,
  unique_customers BIGINT,
  revenue_per_customer NUMERIC,
  performance_rank INTEGER,
  revenue_vs_avg_pct NUMERIC
)
```

**Menu Standardization:**
```sql
menuca_v3.get_franchise_menu_coverage(
  p_parent_id BIGINT
)
RETURNS TABLE (
  total_locations INTEGER,
  parent_dish_count INTEGER,
  locations_with_full_menu INTEGER,
  locations_missing_items INTEGER,
  avg_dish_count NUMERIC,
  min_dish_count INTEGER,
  max_dish_count INTEGER,
  standardization_score NUMERIC
)
```

#### Client Usage (Direct SQL Calls)

**No Edge Functions - Call SQL Directly:**

```typescript
// Load all analytics in parallel
const [analytics, comparison, menuCoverage] = await Promise.all([
  supabase.rpc('get_franchise_analytics', {
    p_parent_id: 986,
    p_period_days: 30
  }),
  supabase.rpc('compare_franchise_locations', {
    p_parent_id: 986,
    p_period_days: 30
  }),
  supabase.rpc('get_franchise_menu_coverage', {
    p_parent_id: 986
  })
]);

// Display in dashboard
console.log(`Total Revenue: $${analytics.data.total_revenue}`);
console.log(`Total Orders: ${analytics.data.total_orders}`);
console.log(`Avg Order Value: $${analytics.data.avg_order_value}`);
console.log(`Top Performer: ${analytics.data.top_location_name}`);

// Show location rankings table
comparison.data.forEach(location => {
  console.log(`#${location.performance_rank}: ${location.location_name} - $${location.revenue}`);
});

// Show menu standardization alert
if (menuCoverage.data.standardization_score < 90) {
  console.warn(`${menuCoverage.data.locations_missing_items} locations need menu updates`);
}
```

**Response Examples:**

**get_franchise_analytics:**
```typescript
{
  chain_id: 986,
  brand_name: "Milano Pizza",
  period_days: 30,
  total_locations: 48,
  active_locations: 43,
  total_orders: 12450,
  total_revenue: 487650.00,
  avg_order_value: 39.17,
  total_customers: 8923,
  revenue_per_customer: 54.65,
  top_location_id: 3,
  top_location_name: "Milano Downtown Ottawa",
  top_location_revenue: 45230.00,
  bottom_location_id: 159,
  bottom_location_name: "Milano Calgary South",
  bottom_location_revenue: 1250.00
}
```

**compare_franchise_locations:**
```typescript
[
  {
    location_id: 3,
    location_name: "Milano Downtown Ottawa",
    location_city: "Ottawa",
    location_status: "active",
    order_count: 1250,
    revenue: 45230.00,
    avg_order_value: 36.18,
    unique_customers: 890,
    revenue_per_customer: 50.82,
    performance_rank: 1,
    revenue_vs_avg_pct: 198.5  // 198% above average
  },
  // ... 47 more locations ranked by revenue
]
```

**get_franchise_menu_coverage:**
```typescript
{
  total_locations: 48,
  parent_dish_count: 87,
  locations_with_full_menu: 42,
  locations_missing_items: 6,
  avg_dish_count: 84.3,
  min_dish_count: 72,
  max_dish_count: 87,
  standardization_score: 87.5  // 87.5% standardized
}
```

**Performance:** ~180-220ms for complete analytics

**Why No Edge Functions:**
- Read-only operations (no data modification)
- Public or RLS-protected data
- Performance-critical (database aggregation is fastest)
- Can add caching at client level

---

### Feature 1.6: Query Franchise Data

**Purpose:** Helper functions to query franchise hierarchies

#### SQL Functions

**Get All Franchise Chains:**
```sql
-- Use the helper view
SELECT * FROM menuca_v3.v_franchise_chains
ORDER BY location_count DESC;
```

**Get Franchise Children:**
```sql
menuca_v3.get_franchise_children(p_parent_id BIGINT)
RETURNS TABLE (
  child_id BIGINT,
  child_name VARCHAR,
  city VARCHAR,
  province VARCHAR,
  status restaurant_status,
  online_ordering_enabled BOOLEAN,
  activated_at TIMESTAMPTZ
)
```

**Get Franchise Summary:**
```sql
menuca_v3.get_franchise_summary(p_parent_id BIGINT)
RETURNS TABLE (
  chain_id BIGINT,
  brand_name VARCHAR,
  total_locations INTEGER,
  active_count INTEGER,
  suspended_count INTEGER,
  pending_count INTEGER,
  total_cities INTEGER,
  total_provinces INTEGER,
  oldest_location_date TIMESTAMPTZ,
  newest_location_date TIMESTAMPTZ
)
```

**Check if Franchise:**
```sql
menuca_v3.is_franchise_location(p_restaurant_id BIGINT)
RETURNS BOOLEAN
```

#### Client Usage (Direct SQL Calls)

```typescript
// Get all franchise chains
const { data: chains } = await supabase
  .from('v_franchise_chains')
  .select('*')
  .order('location_count', { ascending: false });

// Get children of a franchise
const { data: children } = await supabase.rpc('get_franchise_children', {
  p_parent_id: 986
});

// Get franchise summary
const { data: summary } = await supabase.rpc('get_franchise_summary', {
  p_parent_id: 986
});

// Check if restaurant is a franchise location
const { data: isFranchise } = await supabase.rpc('is_franchise_location', {
  p_restaurant_id: 561
});
```

**Performance:** All queries < 50ms

---

### Franchise Component - Summary

**Implementation Status:** ✅ **100% Complete**

| Feature | SQL Functions | Edge Functions | Status |
|---------|--------------|----------------|--------|
| Create Parent | ✅ | ✅ | Complete |
| Link Children | ✅ | ✅ | Complete |
| Bulk Features | ✅ | ✅ | Complete |
| Location Routing | ✅ | ❌ Not needed | Complete |
| Performance Analytics | ✅ | ❌ Not needed | Complete |
| Query Helpers | ✅ | ❌ Not needed | Complete |

**Total Functions:**
- 13 SQL functions
- 3 Edge Functions
- 1 Helper view

**Production Ready:** ✅ Yes  
**Performance:** All operations < 220ms  
**Security:** Authentication on write operations, RLS on reads

---

### Quick Reference - Franchise API

```typescript
// ========================================
// WRITE OPERATIONS (Edge Functions)
// ========================================

// Create franchise parent
await supabase.functions.invoke('create-franchise-parent', {
  body: { name: "Brand", franchise_brand_name: "Brand", timezone: "America/Toronto" }
});

// Link single restaurant
await supabase.functions.invoke('convert-restaurant-to-franchise', {
  body: { restaurant_id: 123, parent_restaurant_id: 456 }
});

// Batch link restaurants
await supabase.functions.invoke('convert-restaurant-to-franchise', {
  body: { parent_restaurant_id: 456, child_restaurant_ids: [123, 124, 125] }
});

// Toggle feature franchise-wide
await supabase.functions.invoke('bulk-update-franchise-feature', {
  body: { parent_restaurant_id: 986, feature_key: "loyalty_program", is_enabled: true }
});

// ========================================
// READ OPERATIONS (Direct SQL)
// ========================================

// Find nearest locations
await supabase.rpc('find_nearest_franchise_locations', {
  p_parent_id: 986,
  p_latitude: 45.4215,
  p_longitude: -75.6972,
  p_max_distance_km: 25,
  p_limit: 5
});

// Get franchise analytics
await supabase.rpc('get_franchise_analytics', {
  p_parent_id: 986,
  p_period_days: 30
});

// Compare locations
await supabase.rpc('compare_franchise_locations', {
  p_parent_id: 986,
  p_period_days: 30
});

// Get menu coverage
await supabase.rpc('get_franchise_menu_coverage', {
  p_parent_id: 986
});

// Query franchise data
await supabase.from('v_franchise_chains').select('*');
await supabase.rpc('get_franchise_children', { p_parent_id: 986 });
await supabase.rpc('get_franchise_summary', { p_parent_id: 986 });
await supabase.rpc('is_franchise_location', { p_restaurant_id: 561 });
```

---

