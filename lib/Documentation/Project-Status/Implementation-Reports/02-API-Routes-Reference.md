# API Routes Reference

**Last Updated:** October 30, 2025  
**✅ UPDATED:** Now follows Santiago's REST conventions (plural routes, nested resources)  
**✅ NEW:** Added Menu Management routes (Phase 1 + Phase 2+)

Complete mapping of all 98 API routes to their corresponding Santiago Edge Functions, SQL Functions, or database tables.

## Quick Reference Table

| Route | Method | Backend Function | Type | Auth Required |
|-------|--------|-----------------|------|---------------|
| **Franchises** *(Updated to PLURAL per Santiago's recommendation)* |
| `/api/franchises` | GET | `get_franchise_chains` | SQL Function | ✅ |
| `/api/franchises/[id]` | GET | `get_franchise_details` | SQL Function | ✅ |
| `/api/franchises/[id]/analytics` | GET | `get_franchise_analytics` | SQL Function | ✅ |
| `/api/franchises` | POST | `create-franchise-parent` | Edge Function | ✅ |
| `/api/franchises/convert` | POST | `convert-restaurant-to-franchise` | Edge Function | ✅ |
| `/api/franchises/[id]/features` | PATCH | `bulk-update-franchise-feature` | Edge Function | ✅ |
| **Menu Management - Courses (Categories)** |
| `/api/menu/courses` | GET | Direct DB (`menu_courses`) | Table Read | ✅ |
| `/api/menu/courses` | POST | Direct DB (`menu_courses`) | Table Write | ✅ |
| `/api/menu/courses/[id]` | PATCH | Direct DB (`menu_courses`) | Table Write | ✅ |
| `/api/menu/courses/[id]` | DELETE | Direct DB (`menu_courses`) | Table Write | ✅ |
| `/api/menu/courses/reorder` | POST | Direct DB (`menu_courses`) | Table Write | ✅ |
| **Menu Management - Dishes** |
| `/api/menu/dishes` | GET | Direct DB (`dishes`) | Table Read | ✅ |
| `/api/menu/dishes` | POST | Direct DB (`dishes`) | Table Write | ✅ |
| `/api/menu/dishes/[id]` | PATCH | Direct DB (`dishes`) | Table Write | ✅ |
| `/api/menu/dishes/[id]` | DELETE | Direct DB (`dishes`) | Table Write | ✅ |
| **Menu Management - Modifier Groups** |
| `/api/menu/dishes/[id]/modifier-groups` | GET | Direct DB (`dish_modifier_groups`) | Table Read | ✅ |
| `/api/menu/dishes/[id]/modifier-groups` | POST | Direct DB (`dish_modifier_groups`) | Table Write | ✅ |
| `/api/menu/dishes/[id]/modifier-groups/[groupId]` | PATCH | Direct DB (`dish_modifier_groups`) | Table Write | ✅ |
| `/api/menu/dishes/[id]/modifier-groups/[groupId]` | DELETE | Direct DB (`dish_modifier_groups`) | Table Write | ✅ |
| `/api/menu/dishes/[id]/modifier-groups/reorder` | POST | Direct DB (`dish_modifier_groups`) | Table Write | ✅ |
| **Menu Management - Modifiers** |
| `/api/menu/modifier-groups/[groupId]/modifiers` | GET | Direct DB (`dish_modifier_items`) | Table Read | ✅ |
| `/api/menu/modifier-groups/[groupId]/modifiers` | POST | Direct DB (`dish_modifier_items`) | Table Write | ✅ |
| `/api/menu/modifier-groups/[groupId]/modifiers/[modifierId]` | PATCH | Direct DB (`dish_modifier_items`) | Table Write | ✅ |
| `/api/menu/modifier-groups/[groupId]/modifiers/[modifierId]` | DELETE | Direct DB (`dish_modifier_items`) | Table Write | ✅ |
| `/api/menu/modifier-groups/[groupId]/modifiers/reorder` | POST | Direct DB (`dish_modifier_items`) | Table Write | ✅ |
| **Menu Management - Inventory** |
| `/api/menu/dishes/[id]/inventory` | PATCH | Direct DB (`dishes.is_available`) | Table Write | ✅ |
| **Restaurant Status** |
| `/api/restaurants/[id]/status` | PATCH | `update-restaurant-status` | Edge Function | ✅ |
| `/api/restaurants/[id]/status-history` | GET | `get_restaurant_status_history` | SQL Function | ✅ |
| `/api/restaurants/[id]/online-ordering` | PATCH | `toggle-online-ordering` | Edge Function | ✅ |
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

**✅ UPDATED:** All routes now use PLURAL `/api/franchises/*` per Santiago's REST convention

#### GET /api/franchises
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

#### GET /api/franchises/[id]
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

#### GET /api/franchises/[id]/analytics
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

#### POST /api/franchises
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

#### POST /api/franchises/convert
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

**✅ Route Updated:** Changed from `/api/franchise/link-children` to `/api/franchises/convert` (REST noun-based pattern)

---

#### PATCH /api/franchises/[id]/features
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

**✅ Route Updated:** Changed from `/api/franchise/bulk-feature` to `/api/franchises/[id]/features` (nested resource pattern)

---

### Menu Management Routes

**✅ NEW:** Complete menu management system (Phase 1 + Phase 2+)

**Phase 1 Scope:** Core CRUD for menu categories (courses) and dishes  
**Phase 2+ Scope:** Modifier groups, modifiers, inventory tracking, bulk operations

**Database Tables:**
- `menu_courses` - Menu categories
- `dishes` - Menu items
- `dish_modifier_groups` - Modifier groups (sizes, toppings, etc.)
- `dish_modifier_items` - Individual modifiers within groups
- `dishes.is_available` - Inventory tracking field
- `dishes.pricing_rules` - JSON field for advanced pricing (not yet implemented in UI)

#### GET /api/menu/courses
**Purpose:** Get all menu categories for a restaurant

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('menu_courses')
  .select('*')
  .eq('restaurant_id', restaurantId)
  .order('display_order');
```

**Direct DB:** Read from `menu_courses` table

**Query Parameters:**
- `restaurant_id` (required)

**Returns:**
```typescript
{
  id: number;
  restaurant_id: number;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}[]
```

**Authentication:** Required

---

#### POST /api/menu/courses
**Purpose:** Create new menu category

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('menu_courses')
  .insert({
    restaurant_id: number,
    name: string,
    description?: string,
    display_order: number,
    is_active: boolean
  })
  .select()
  .single();
```

**Direct DB:** Insert to `menu_courses` table

**Request Body:**
```typescript
{
  restaurant_id: number;
  name: string;
  description?: string;
  is_active?: boolean;
}
```

**Features:**
- Auto-calculates display_order (max + 1)
- Validates restaurant ownership

**Authentication:** Required

---

#### PATCH /api/menu/courses/[id]
**Purpose:** Update menu category

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('menu_courses')
  .update({
    name?: string,
    description?: string,
    is_active?: boolean
  })
  .eq('id', courseId)
  .eq('restaurant_id', restaurantId)
  .select()
  .single();
```

**Direct DB:** Update `menu_courses` table

**Request Body:**
```typescript
{
  restaurant_id: number; // For validation
  name?: string;
  description?: string;
  is_active?: boolean;
}
```

**Security:** Restaurant ownership validation via compound WHERE clause

**Authentication:** Required

---

#### DELETE /api/menu/courses/[id]
**Purpose:** Delete menu category (hard delete)

**Backend Integration:**
```typescript
const { error } = await supabase
  .schema('menuca_v3')
  .from('menu_courses')
  .delete()
  .eq('id', courseId)
  .eq('restaurant_id', restaurantId);
```

**Direct DB:** Delete from `menu_courses` table

**Request Body:**
```typescript
{
  restaurant_id: number; // For validation
}
```

**Security:** Restaurant ownership validation

**Authentication:** Required

---

#### POST /api/menu/courses/reorder
**Purpose:** Bulk reorder menu categories (drag-and-drop)

**Backend Integration:**
```typescript
// Updates multiple courses in single transaction
const updates = courseIds.map((id, index) => ({
  id,
  display_order: index
}));

const { error } = await supabase
  .schema('menuca_v3')
  .from('menu_courses')
  .upsert(updates);
```

**Direct DB:** Bulk update `menu_courses.display_order`

**Request Body:**
```typescript
{
  restaurant_id: number; // For validation
  course_ids: number[]; // Ordered array
}
```

**Features:**
- Atomic bulk update
- Maintains drag-drop order

**Authentication:** Required

---

#### GET /api/menu/dishes
**Purpose:** Get all dishes for a restaurant with optional filtering

**Backend Integration:**
```typescript
let query = supabase
  .schema('menuca_v3')
  .from('dishes')
  .select('*')
  .eq('restaurant_id', restaurantId);

// Optional filters
if (course_id) query = query.eq('course_id', course_id);
if (is_active !== undefined) query = query.eq('is_active', is_active);

const { data } = await query.order('name');
```

**Direct DB:** Read from `dishes` table

**Query Parameters:**
- `restaurant_id` (required)
- `course_id` (optional) - Filter by category
- `is_active` (optional) - Filter by active status

**Returns:**
```typescript
{
  id: number;
  restaurant_id: number;
  course_id: number | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_available: boolean; // Inventory tracking
  pricing_rules: object | null; // JSON field
}[]
```

**Authentication:** Required

---

#### POST /api/menu/dishes
**Purpose:** Create new dish

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('dishes')
  .insert({
    restaurant_id: number,
    name: string,
    description?: string,
    price: number,
    course_id?: number,
    image_url?: string,
    is_active: boolean,
    is_featured: boolean,
    is_available: boolean
  })
  .select()
  .single();
```

**Direct DB:** Insert to `dishes` table

**Request Body:**
```typescript
{
  restaurant_id: number;
  name: string;
  description?: string;
  price: number;
  course_id?: number;
  image_url?: string;
  is_active?: boolean;
  is_featured?: boolean;
}
```

**Features:**
- Validates course_id belongs to restaurant
- Defaults: is_active=true, is_featured=false, is_available=true

**Authentication:** Required

---

#### PATCH /api/menu/dishes/[id]
**Purpose:** Update dish (supports partial updates)

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('dishes')
  .update({
    name?: string,
    description?: string,
    price?: number,
    course_id?: number,
    image_url?: string,
    is_active?: boolean,
    is_featured?: boolean,
    is_available?: boolean
  })
  .eq('id', dishId)
  .eq('restaurant_id', restaurantId)
  .select()
  .single();
```

**Direct DB:** Update `dishes` table

**Request Body:**
```typescript
{
  restaurant_id: number; // For validation
  name?: string;
  description?: string;
  price?: number;
  course_id?: number;
  image_url?: string;
  is_active?: boolean;
  is_featured?: boolean;
  is_available?: boolean;
}
```

**Security:** Restaurant ownership validation

**Authentication:** Required

---

#### DELETE /api/menu/dishes/[id]
**Purpose:** Delete dish (hard delete)

**Backend Integration:**
```typescript
const { error } = await supabase
  .schema('menuca_v3')
  .from('dishes')
  .delete()
  .eq('id', dishId)
  .eq('restaurant_id', restaurantId);
```

**Direct DB:** Delete from `dishes` table

**Request Body:**
```typescript
{
  restaurant_id: number; // For validation
}
```

**Security:** Restaurant ownership validation

**Authentication:** Required

---

#### GET /api/menu/dishes/[id]/modifier-groups
**Purpose:** Get all modifier groups for a dish

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('dish_modifier_groups')
  .select('*')
  .eq('dish_id', dishId)
  .order('display_order');
```

**Direct DB:** Read from `dish_modifier_groups` table

**Returns:**
```typescript
{
  id: number;
  dish_id: number;
  name: string;
  min_selections: number;
  max_selections: number;
  display_order: number;
  is_required: boolean;
}[]
```

**Authentication:** Required

**Security:** Validates dish belongs to restaurant via ownership chain

---

#### POST /api/menu/dishes/[id]/modifier-groups
**Purpose:** Create modifier group for a dish

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('dish_modifier_groups')
  .insert({
    dish_id: number,
    name: string,
    min_selections: number,
    max_selections: number,
    display_order: number,
    is_required: boolean
  })
  .select()
  .single();
```

**Direct DB:** Insert to `dish_modifier_groups` table

**Request Body:**
```typescript
{
  name: string;
  min_selections?: number; // Default: 0
  max_selections?: number; // Default: 1
  is_required?: boolean; // Default: false
}
```

**Features:**
- Auto-calculates display_order
- Validates min <= max selections
- Ownership chain validation (dish→restaurant)

**Special Workflow - Quick Create Size:**
```typescript
// "Quick Create Size" button uses this endpoint to create:
{
  name: "Size",
  min_selections: 1,
  max_selections: 1,
  is_required: true,
  // Then auto-creates modifiers: Small, Medium, Large
}
```

**Authentication:** Required

---

#### PATCH /api/menu/dishes/[id]/modifier-groups/[groupId]
**Purpose:** Update modifier group

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('dish_modifier_groups')
  .update({
    name?: string,
    min_selections?: number,
    max_selections?: number,
    is_required?: boolean
  })
  .eq('id', groupId)
  .eq('dish_id', dishId)
  .select()
  .single();
```

**Direct DB:** Update `dish_modifier_groups` table

**Request Body:**
```typescript
{
  name?: string;
  min_selections?: number;
  max_selections?: number;
  is_required?: boolean;
}
```

**Validation:**
- Server-side: min <= max
- Ownership chain: modifier-group→dish→restaurant

**Authentication:** Required

---

#### DELETE /api/menu/dishes/[id]/modifier-groups/[groupId]
**Purpose:** Delete modifier group and all its modifiers (cascade)

**Backend Integration:**
```typescript
const { error } = await supabase
  .schema('menuca_v3')
  .from('dish_modifier_groups')
  .delete()
  .eq('id', groupId)
  .eq('dish_id', dishId);
```

**Direct DB:** Delete from `dish_modifier_groups` table (cascades to modifiers)

**Features:**
- Cascading delete removes all child modifiers
- Ownership validation

**Authentication:** Required

---

#### POST /api/menu/dishes/[id]/modifier-groups/reorder
**Purpose:** Bulk reorder modifier groups (drag-and-drop)

**Backend Integration:**
```typescript
const updates = groupIds.map((id, index) => ({
  id,
  display_order: index
}));

const { error } = await supabase
  .schema('menuca_v3')
  .from('dish_modifier_groups')
  .upsert(updates);
```

**Direct DB:** Bulk update `dish_modifier_groups.display_order`

**Request Body:**
```typescript
{
  group_ids: number[]; // Ordered array
}
```

**Features:**
- Atomic bulk update
- Maintains drag-drop order

**Authentication:** Required

---

#### GET /api/menu/modifier-groups/[groupId]/modifiers
**Purpose:** Get all modifiers within a modifier group

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('dish_modifier_items')
  .select('*')
  .eq('modifier_group_id', groupId)
  .order('display_order');
```

**Direct DB:** Read from `dish_modifier_items` table

**Returns:**
```typescript
{
  id: number;
  modifier_group_id: number;
  name: string;
  price_adjustment: number;
  display_order: number;
  is_default: boolean;
}[]
```

**Authentication:** Required

**Security:** Validates group→dish→restaurant ownership chain

---

#### POST /api/menu/modifier-groups/[groupId]/modifiers
**Purpose:** Create modifier within a group

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('dish_modifier_items')
  .insert({
    modifier_group_id: number,
    name: string,
    price_adjustment: number,
    display_order: number,
    is_default: boolean
  })
  .select()
  .single();
```

**Direct DB:** Insert to `dish_modifier_items` table

**Request Body:**
```typescript
{
  name: string;
  price_adjustment?: number; // Default: 0 (in cents)
  is_default?: boolean; // Default: false
}
```

**Features:**
- Auto-calculates display_order
- Price adjustment in cents (e.g., 200 = $2.00)
- Ownership chain validation

**Authentication:** Required

---

#### PATCH /api/menu/modifier-groups/[groupId]/modifiers/[modifierId]
**Purpose:** Update modifier

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('dish_modifier_items')
  .update({
    name?: string,
    price_adjustment?: number,
    is_default?: boolean
  })
  .eq('id', modifierId)
  .eq('modifier_group_id', groupId)
  .select()
  .single();
```

**Direct DB:** Update `dish_modifier_items` table

**Request Body:**
```typescript
{
  name?: string;
  price_adjustment?: number;
  is_default?: boolean;
}
```

**Security:** Ownership chain validation (modifier→group→dish→restaurant)

**Authentication:** Required

---

#### DELETE /api/menu/modifier-groups/[groupId]/modifiers/[modifierId]
**Purpose:** Delete modifier

**Backend Integration:**
```typescript
const { error } = await supabase
  .schema('menuca_v3')
  .from('dish_modifier_items')
  .delete()
  .eq('id', modifierId)
  .eq('modifier_group_id', groupId);
```

**Direct DB:** Delete from `dish_modifier_items` table

**Security:** Ownership validation

**Authentication:** Required

---

#### POST /api/menu/modifier-groups/[groupId]/modifiers/reorder
**Purpose:** Bulk reorder modifiers within a group (drag-and-drop)

**Backend Integration:**
```typescript
const updates = modifierIds.map((id, index) => ({
  id,
  display_order: index
}));

const { error } = await supabase
  .schema('menuca_v3')
  .from('dish_modifier_items')
  .upsert(updates);
```

**Direct DB:** Bulk update `dish_modifier_items.display_order`

**Request Body:**
```typescript
{
  modifier_ids: number[]; // Ordered array
}
```

**Features:**
- Atomic bulk update
- Maintains drag-drop order

**Authentication:** Required

---

#### PATCH /api/menu/dishes/[id]/inventory
**Purpose:** Toggle dish availability (inventory tracking)

**Backend Integration:**
```typescript
const { data } = await supabase
  .schema('menuca_v3')
  .from('dishes')
  .update({
    is_available: boolean
  })
  .eq('id', dishId)
  .select()
  .single();
```

**Direct DB:** Update `dishes.is_available` field

**Request Body:**
```typescript
{
  is_available: boolean; // true = in stock, false = sold out
}
```

**Features:**
- UI shows "Sold Out" badge when is_available=false
- Supports bulk operations via multiple PATCH calls
- Real-time inventory status across all views

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

#### PATCH /api/restaurants/[id]/online-ordering
**Purpose:** Toggle online ordering on/off

**Backend Integration:**
```typescript
const { data } = await supabase.functions.invoke('toggle-online-ordering', {
  body: {
    restaurant_id: id, // From URL path parameter
    online_ordering_enabled: boolean
  }
});
```

**Edge Function:** `toggle-online-ordering`

**Features:** Audit logging

**Authentication:** Required

**✅ Route Updated:** Changed from `/api/restaurants/toggle-online-ordering` (flat with ID in body) to `/api/restaurants/[id]/online-ordering` (nested RESTful resource)

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
