# 🤖 FOR REPLIT AGENT: Library Template System Implementation

## What Was Done (Database Complete ✅)

The **database schema is 100% complete**. We enhanced the existing `modifier_groups` table instead of creating duplicate tables. All 358,499 existing modifiers are intact and working.

### Database Changes Applied:
```sql
✅ Enhanced modifier_groups table:
   - Added: course_template_id, is_custom, deleted_at columns
   - All existing 22,632 groups preserved (marked as is_custom=true)

✅ Created library template tables:
   - course_modifier_templates (for global library)
   - course_template_modifiers (for library options)

✅ Created 4 helper functions:
   - apply_template_to_dish()
   - apply_all_templates_to_dish()
   - break_modifier_inheritance()
   - sync_template_to_inherited_groups()
```

---

## Your Task: Build the UI/API Layer

### 1. Create Modifier Groups Library Page

**Route:** `/admin/menu/modifier-groups`

**Purpose:** Admins can create global modifier templates (like "Sizes", "Toppings")

**API Endpoints Needed:**
```typescript
// List all library groups (course_id IS NULL)
GET /api/menu/modifier-library
Response: Array<{
  id: number;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  modifiers: Array<{
    id: number;
    name: string;
    price: number;
  }>;
}>

// Create library group
POST /api/menu/modifier-library
Body: {
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  modifiers: Array<{
    name: string;
    price: number;
  }>;
}

// Update library group
PUT /api/menu/modifier-library/:id
Body: { name?, is_required?, modifiers? }

// Delete library group
DELETE /api/menu/modifier-library/:id
```

**UI Components:**
```
┌─────────────────────────────────────┐
│ Modifier Groups Library             │
├─────────────────────────────────────┤
│ [+ Create New Group]                │
│                                     │
│ ┌─ Sizes ─────────────────────────┐│
│ │ Required: Yes                    ││
│ │ Min: 1  Max: 1                   ││
│ │                                  ││
│ │ Modifiers:                       ││
│ │ • Small        $0.00             ││
│ │ • Medium       $3.00             ││
│ │ • Large        $5.00             ││
│ │                                  ││
│ │ [Edit] [Delete] [View Usage]     ││
│ └──────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

### 2. Category Template Associations

**Location:** Add to existing category management UI

**Purpose:** Link library groups to categories (e.g., "Sizes" → "Pizza" category)

**API Endpoints Needed:**
```typescript
// Get templates associated with category
GET /api/menu/categories/:courseId/templates
Response: Array<{
  id: number;
  library_template_id: number;
  library_name: string;
  is_required: boolean;
}>

// Associate library group with category
POST /api/menu/categories/:courseId/templates
Body: {
  library_template_id: number;
}

// Remove association
DELETE /api/menu/categories/:courseId/templates/:templateId
```

**UI Addition:**
```
Category Edit Page:
┌─────────────────────────────────────┐
│ Pizza Category                      │
├─────────────────────────────────────┤
│ Name: Pizza                         │
│ Display Order: 1                    │
│                                     │
│ Associated Modifier Templates:      │
│ ☑ Sizes                            │
│ ☑ Toppings                         │
│ ☐ Crust Type                       │
│                                     │
│ [Save]                              │
└─────────────────────────────────────┘
```

---

### 3. Update Dish Modifier Editor

**Location:** Existing dish edit page → modifiers section

**Changes:**
- Show "Inherited" badge on groups from templates
- Add "Break Inheritance" button for inherited groups
- Show template source (e.g., "From: Sizes Library")

**API Updates:**
```typescript
// Existing endpoint should return inheritance info
GET /api/menu/dishes/:id/modifier-groups
Response: Array<{
  id: number;
  name: string;
  is_custom: boolean;              // NEW
  course_template_id: number|null; // NEW
  template_name: string|null;      // NEW (from JOIN)
  modifiers: Array<{...}>;
}>

// Break inheritance
POST /api/menu/dishes/:dishId/modifier-groups/:groupId/break-inheritance
Response: { success: boolean }
```

**UI Enhancement:**
```
Dish Editor - Modifiers Section:
┌─────────────────────────────────────┐
│ Modifier Groups                     │
├─────────────────────────────────────┤
│ ┌─ Sizes ──────────────────────────┐│
│ │ 🔗 Inherited from "Sizes Library"││
│ │ Min: 1  Max: 1                   ││
│ │ • Small    $0.00                 ││
│ │ • Large    $3.00                 ││
│ │                                  ││
│ │ [Break Inheritance] [Edit]       ││
│ └──────────────────────────────────┘│
│                                     │
│ ┌─ Toppings ───────────────────────┐│
│ │ ⚙️  Custom (not inherited)       ││
│ │ Min: 0  Max: 10                  ││
│ │ • Pepperoni  $1.50               ││
│ │                                  ││
│ │ [Edit] [Delete]                  ││
│ └──────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

### 4. Auto-Apply Templates on Dish Creation

**Location:** Dish creation flow

**Logic:**
```typescript
async function createDish(dishData: CreateDishInput) {
  // 1. Create the dish
  const dish = await supabase
    .from('dishes')
    .insert(dishData)
    .select()
    .single();
  
  // 2. Auto-apply category templates (NEW)
  const { data: templates } = await supabase
    .from('course_modifier_templates')
    .select('id')
    .eq('course_id', dishData.course_id)
    .is('deleted_at', null);
  
  // 3. Apply each template
  for (const template of templates) {
    await supabase.rpc('apply_template_to_dish', {
      p_dish_id: dish.id,
      p_template_id: template.id
    });
  }
  
  return dish;
}
```

---

## Database Queries You'll Need

### Get Library Groups (Global Templates)
```typescript
const { data: libraryGroups } = await supabase
  .from('course_modifier_templates')
  .select(`
    id,
    name,
    is_required,
    min_selections,
    max_selections,
    course_template_modifiers (
      id,
      name,
      price,
      display_order
    )
  `)
  .is('course_id', null)  // Global library
  .is('deleted_at', null)
  .order('name');
```

### Get Category Associations
```typescript
const { data: associations } = await supabase
  .from('course_modifier_templates')
  .select(`
    id,
    library_template_id,
    library:course_modifier_templates!library_template_id (
      id,
      name
    )
  `)
  .eq('course_id', categoryId)
  .not('library_template_id', 'is', null)
  .is('deleted_at', null);
```

### Get Dish Modifiers with Inheritance
```typescript
const { data: modifierGroups } = await supabase
  .from('modifier_groups')
  .select(`
    id,
    name,
    is_required,
    is_custom,
    course_template_id,
    template:course_modifier_templates (
      id,
      name
    ),
    dish_modifiers (
      id,
      name,
      display_order,
      dish_modifier_prices (
        price
      )
    )
  `)
  .eq('dish_id', dishId)
  .is('deleted_at', null)
  .order('display_order');
```

### Break Inheritance
```typescript
const { data } = await supabase.rpc('break_modifier_inheritance', {
  p_group_id: groupId
});
```

---

## Testing Checklist

### Phase 1: Verify Existing System (Critical!)
- [ ] All existing dishes show modifiers correctly
- [ ] Customer ordering flow works (no broken modifiers)
- [ ] Modifier prices display correctly
- [ ] Existing API endpoints work unchanged

### Phase 2: Library Creation
- [ ] Can create global library group
- [ ] Can add modifier options to library
- [ ] Can edit library group name/settings
- [ ] Can delete library group (if unused)

### Phase 3: Category Association
- [ ] Can link library group to category
- [ ] Can unlink library group from category
- [ ] Category page shows associated libraries

### Phase 4: Dish Inheritance
- [ ] New dish auto-gets category templates
- [ ] Dish editor shows "Inherited" badge
- [ ] Can break inheritance (becomes custom)
- [ ] Breaking inheritance copies modifiers

### Phase 5: Bulk Updates
- [ ] Update library modifier price
- [ ] All inherited dishes update automatically
- [ ] Custom dishes NOT affected
- [ ] Verify customer sees updated prices

---

## Important Notes

### ⚠️ All Existing Modifiers Are "Custom"
- Every existing modifier_group has `is_custom=true`
- They DO NOT inherit from templates (course_template_id=NULL)
- This means existing menus work EXACTLY as before
- No behavioral changes until admins explicitly use templates

### ⚠️ Don't Break Foreign Keys
- `dish_modifiers.modifier_group_id` points to `modifier_groups` (unchanged)
- Do NOT try to update this column
- The table name is `modifier_groups` (not dish_modifier_groups)

### ⚠️ Soft Deletes
- Use `deleted_at` for soft deletes (don't hard delete)
- Always filter: `WHERE deleted_at IS NULL`
- This enables undo/restore functionality

---

## Schema Reference

### modifier_groups (ENHANCED EXISTING TABLE)
```sql
id                    bigint PRIMARY KEY
dish_id               bigint NOT NULL
name                  varchar NOT NULL
is_required           boolean
min_selections        integer
max_selections        integer
display_order         integer
instructions          text
parent_modifier_id    bigint
created_at            timestamp
updated_at            timestamp
course_template_id    integer NULL      -- NEW: NULL=custom, ID=inherited
is_custom             boolean           -- NEW: true=custom, false=inherited
deleted_at            timestamp NULL    -- NEW: soft delete
```

### course_modifier_templates (NEW)
```sql
id                    serial PRIMARY KEY
course_id             integer NULL      -- NULL=global library, ID=category
library_template_id   integer NULL      -- For category→library association
name                  varchar
is_required           boolean
min_selections        integer
max_selections        integer
display_order         integer
created_at            timestamp
updated_at            timestamp
deleted_at            timestamp
```

### course_template_modifiers (NEW)
```sql
id              serial PRIMARY KEY
template_id     integer NOT NULL
name            varchar
price           decimal
is_included     boolean
display_order   integer
created_at      timestamp
updated_at      timestamp
deleted_at      timestamp
```

---

## File Locations

**Documentation:**
- `LIBRARY_TEMPLATE_SETUP_SUMMARY.md` - Full technical details
- `FOR_REPLIT_AGENT.md` - This file

**Migration Applied:**
- `migrations/013_enhance_existing_modifier_groups.sql`

**Reference (not applied):**
- `migrations/MODIFIER_MIGRATION_PLAN.md` - Context on why we chose this approach

---

## Questions?

If you need clarification on any of these tasks or need help with implementation, refer to:
1. `LIBRARY_TEMPLATE_SETUP_SUMMARY.md` for database details
2. Existing menu builder code for patterns
3. Database schema inspection: `SELECT * FROM information_schema.columns WHERE table_name = 'modifier_groups'`

**Good luck! The hard part (database) is done. Now it's just UI/API glue.** 🚀

