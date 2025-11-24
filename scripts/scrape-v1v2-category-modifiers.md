# 🔍 Scrape Category-Level Modifiers from v1/v2

## The Missing Piece

Your v1/v2 → v3 migration scraped:
- ✅ Dishes (dish-by-dish)
- ✅ Dish-level modifier groups
- ❌ **Category-level modifier groups** ← MISSED!

## What You Need to Do

### Step 1: Query v1/v2 for Category Modifiers

Ask your dev to run this on the **v1/v2 database**:

```sql
-- Find the category modifier tables in v1/v2
-- (table names might vary - adjust as needed)

-- Option 1: Look for category modifier tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%category%modifier%'
   OR table_name LIKE '%course%modifier%';

-- Option 2: Check if there's a "level" or "scope" column in modifier_groups
SELECT DISTINCT 
    scope,      -- might be 'category', 'dish', 'global'
    level,      -- might be 'category', 'item'
    type        -- might indicate category vs dish
FROM modifier_groups
LIMIT 20;

-- Option 3: Look for modifier_groups without dish_id (category level)
SELECT *
FROM modifier_groups
WHERE dish_id IS NULL          -- Category level
  OR category_id IS NOT NULL   -- Has category FK
LIMIT 10;
```

### Step 2: Export Category Modifiers

Once you find the table/structure:

```sql
-- Export all category-level modifier groups
SELECT 
    category_id,        -- or course_id
    modifier_group_name,
    is_required,
    min_selections,
    max_selections,
    display_order,
    -- Get the modifiers in the group
    (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'name', m.name,
            'price', m.price,
            'display_order', m.order
        ) ORDER BY m.order
    ) FROM modifiers m WHERE m.group_id = mg.id) as modifiers
FROM category_modifier_groups mg  -- or whatever table name
ORDER BY category_id, display_order;
```

### Step 3: Import to v3

Map v1/v2 category IDs to v3 course IDs:

```javascript
// Get v1/v2 → v3 category mapping
const categoryMapping = await supabase
  .from('courses')
  .select('id, legacy_v1_id, legacy_v2_id')
  .not('legacy_v1_id', 'is', null);

// For each category modifier from v1/v2
for (const categoryModifier of v1v2CategoryModifiers) {
  
  // Find v3 course_id
  const v3CourseId = categoryMapping.find(
    c => c.legacy_v1_id === categoryModifier.v1_category_id
      || c.legacy_v2_id === categoryModifier.v2_category_id
  )?.id;
  
  if (!v3CourseId) {
    console.warn('Category not found:', categoryModifier);
    continue;
  }
  
  // Create category template in v3
  const { data: template } = await supabase
    .from('course_modifier_templates')
    .insert({
      course_id: v3CourseId,  // The v3 category ID
      name: categoryModifier.name,
      is_required: categoryModifier.required,
      min_selections: categoryModifier.min,
      max_selections: categoryModifier.max,
      display_order: categoryModifier.order
    })
    .select()
    .single();
  
  // Add modifiers to template
  for (const modifier of categoryModifier.modifiers) {
    await supabase
      .from('course_template_modifiers')
      .insert({
        template_id: template.id,
        name: modifier.name,
        price: modifier.price,
        display_order: modifier.order
      });
  }
  
  // Apply template to ALL dishes in category
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id')
    .eq('course_id', v3CourseId)
    .is('deleted_at', null);
  
  for (const dish of dishes) {
    await supabase.rpc('apply_template_to_dish', {
      p_dish_id: dish.id,
      p_template_id: template.id
    });
  }
  
  console.log(`✓ Migrated category modifier: ${categoryModifier.name} → ${v3CourseId}`);
}
```

---

## Alternative: API-Based Approach

If you can't access v1/v2 database directly, use the API:

```javascript
// For each restaurant
const restaurant = await v1v2API.getRestaurant(restaurantId);

// Get categories with their category-level modifiers
for (const category of restaurant.categories) {
  
  // Check if category has modifiers at category level
  if (category.modifierGroups && category.modifierGroups.length > 0) {
    
    console.log(`Found category modifiers for: ${category.name}`);
    
    // Map to v3 and create templates
    await createCategoryTemplates(category);
  }
}
```

---

## Quick Test Query

Ask your dev to run this on **v1/v2**:

```sql
-- Check if "Dips" exists at category level for Pizza category
SELECT * FROM [category_modifiers_table]  -- table name TBD
WHERE category_id = [pizza_category_id]
AND name LIKE '%Dip%';
```

If it returns rows → **CONFIRMED: Category-level groups exist in v1/v2**

---

## What We Just Did (Migration 014)

The migration we ran **recovered some category patterns** by analyzing dish-level data:

```
Analyzed: 22,632 dish-level groups
Found: 1,303 patterns (groups on 80%+ of dishes)
Created: 1,303 category templates
Result: Partial recovery, but missing the ones that weren't scraped
```

**This is GOOD but incomplete.** We need the actual v1/v2 category modifiers to be fully accurate.

---

## Summary for Your Dev

**You need to:**
1. Identify the v1/v2 table/API that has category-level modifiers
2. Export them
3. Import to v3 as `course_modifier_templates`
4. Apply to all dishes in each category
5. Then our pattern detection can complement (find missed patterns)

**Want me to help write the scraper once you know the v1/v2 schema?**

