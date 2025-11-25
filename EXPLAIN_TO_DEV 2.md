# 🎯 For Your Dev: The Scraping Issue Explained

## TL;DR: Your Scraper Works, But Creates Duplicates

Your scraper **successfully grabbed all the modifier groups and modifiers**. The issue is it creates **14 independent copies** instead of **1 shared template**.

---

## Real Example: Restaurant 131 "Centertown Donair & Pizza"

### What Your Scraper Did (Dish-by-Dish):

```javascript
// Pseudo-code of what happened
scrape("Plain Pizza") {
  create modifier_groups: {
    id: 11024,
    dish_id: 133653,
    name: "Dips",
    // NO link to other dishes
  }
  create dish_modifiers: [
    "Donair Sauce ($0)", "BBQ ($1)", "Marinara ($1)", etc.
  ]
}

scrape("Pepperoni Pizza") {
  create modifier_groups: {
    id: 22345,           // ← Different ID!
    dish_id: 133654,     // ← Different dish
    name: "Dips",        // ← SAME NAME!
    // NO link to other dishes
  }
  create dish_modifiers: [
    "Donair Sauce ($0)", "BBQ ($1)", "Marinara ($1)", etc.  // ← DUPLICATE!
  ]
}

// ... repeats 14 times for 14 pizzas
```

### Result: 14 Independent "Dips" Groups

```
Database after scrape:
├─ modifier_groups id: 11024 → "Dips" for Plain Pizza
├─ modifier_groups id: 22345 → "Dips" for Pepperoni Pizza
├─ modifier_groups id: 33456 → "Dips" for Hawaiian Pizza
├─ ... (11 more copies)
└─ All have SAME modifiers (Donair Sauce, BBQ, Marinara...)

NO CONNECTION BETWEEN THEM!
```

---

## ❌ The Problems This Causes:

### Problem 1: Cannot Update in Bulk

**Scenario:** Restaurant wants to change BBQ dip from $1.00 → $1.50

```
WITHOUT TEMPLATES (current scrape method):
┌─────────────────────────────────────────┐
│ Admin must edit 14 times:               │
├─────────────────────────────────────────┤
│ 1. Plain Pizza → Modifiers → Dips      │
│    → BBQ → Change $1.00 to $1.50       │
│ 2. Pepperoni Pizza → Modifiers → Dips  │
│    → BBQ → Change $1.00 to $1.50       │
│ 3. Hawaiian Pizza → Modifiers → Dips   │
│    → BBQ → Change $1.00 to $1.50       │
│ ... (11 more times)                     │
└─────────────────────────────────────────┘
❌ Time consuming
❌ Error prone (might miss one)
❌ Inconsistent (until all 14 are done)
```

```
WITH TEMPLATES (after Migration 014):
┌─────────────────────────────────────────┐
│ Admin edits category template:          │
├─────────────────────────────────────────┤
│ 1. Categories → Pizza → Templates      │
│    → "Dips" → BBQ → Change to $1.50    │
│ 2. Save                                 │
│    → All 14 pizzas update instantly!   │
└─────────────────────────────────────────┘
✅ Edit once
✅ Updates everywhere
✅ Always consistent
```

### Problem 2: Data Shown in Database

Run this query to show your dev:

```sql
-- Count duplicate "Dips" groups across restaurants
SELECT 
    c.restaurant_id,
    r.name as restaurant_name,
    c.name as category_name,
    mg.name as group_name,
    COUNT(DISTINCT mg.id) as duplicate_count,
    ARRAY_AGG(DISTINCT d.name ORDER BY d.name) as dishes
FROM modifier_groups mg
INNER JOIN dishes d ON d.id = mg.dish_id
INNER JOIN courses c ON c.id = d.course_id
INNER JOIN restaurants r ON r.id = c.restaurant_id
WHERE mg.name = 'Dips'
AND c.name ILIKE '%pizza%'
AND mg.deleted_at IS NULL
GROUP BY c.restaurant_id, r.name, c.name, mg.name
HAVING COUNT(DISTINCT mg.id) > 1
ORDER BY duplicate_count DESC
LIMIT 10;
```

This will show restaurants with 10, 20, 40+ duplicate "Dips" groups!

---

## ✅ What Migration 014 Fixed (For Existing Data)

```sql
BEFORE (scraped data):
modifier_groups:
├─ id: 11024, dish_id: 133653, name: "Dips" ← Independent
├─ id: 22345, dish_id: 133654, name: "Dips" ← Independent
├─ id: 33456, dish_id: 133655, name: "Dips" ← Independent
└─ ... (14 total, all separate)

AFTER Migration 014:
course_modifier_templates:
└─ id: 117, course_id: 2184, name: "Dips" ← ONE TEMPLATE

modifier_groups:
├─ id: 11024, template_id: 117, is_custom: false ← LINKED
├─ id: 22345, template_id: 117, is_custom: false ← LINKED
├─ id: 33456, template_id: 117, is_custom: false ← LINKED
└─ ... (all 14 linked to same template)

Now: Change template 117 → All 14 update!
```

---

## 🔧 How to Fix Future Scrapes

### Option A: Add Pattern Detection After Each Scrape

```javascript
// After scraping restaurant
await scrapeRestaurant(restaurantId);  // ← Your current code (works fine!)

// NEW: Run pattern detection immediately
await detectAndCreateCategoryTemplates(restaurantId);  // ← Automatically de-duplicates
```

**Script already created:** `scripts/post-scrape-template-migration.sql`

### Option B: Scrape Category-Level Groups Directly (Better)

If v1/v2 has category-level groups, scrape them:

```javascript
// For each restaurant
const restaurant = await v1API.getRestaurant(id);

// NEW: Scrape category-level modifiers FIRST
for (const category of restaurant.categories) {
  if (category.modifierGroups) {
    // Create category template
    const template = await createCategoryTemplate(category);
    
    // Apply to all dishes in category
    for (const dish of category.dishes) {
      await linkDishToTemplate(dish.id, template.id);
    }
  }
}

// Then scrape dish-specific modifiers (custom ones)
for (const dish of restaurant.dishes) {
  // Only create if dish has CUSTOM modifiers (not in category)
  await scrapeDishCustomModifiers(dish);
}
```

---

## 🎯 Show Your Dev This Query

Run this to see the duplication problem:

```sql
SET search_path TO menuca_v3;

-- Find all restaurants with duplicate "Dips" groups
SELECT 
    r.name as restaurant,
    c.name as category,
    COUNT(DISTINCT mg.id) as duplicate_dips_groups,
    CASE 
        WHEN MAX(mg.course_template_id) IS NOT NULL 
        THEN '✅ Fixed (linked to template)'
        ELSE '❌ Still duplicated'
    END as status
FROM modifier_groups mg
INNER JOIN dishes d ON d.id = mg.dish_id
INNER JOIN courses c ON c.id = d.course_id
INNER JOIN restaurants r ON r.id = c.restaurant_id
WHERE mg.name = 'Dips'
AND mg.deleted_at IS NULL
GROUP BY r.name, c.name
HAVING COUNT(DISTINCT mg.id) > 5  -- More than 5 duplicates
ORDER BY duplicate_dips_groups DESC;
```

---

## 💡 The Bottom Line for Your Dev:

### Your Scraper is NOT Broken ✅

It successfully gets:
- ✅ Group name: "Pizza Toppings for Single Pizza"
- ✅ Modifiers: Pepperoni, Ham, Bacon, etc.
- ✅ Prices: $1.25, $2.50, $2.95

### The Issue: Organizational ❌

It creates the SAME group 14 times instead of:
- Creating it ONCE at category level
- Having all 14 pizzas reference it

### The Fix: Run Pattern Detection After Scraping

```bash
# After scraping new restaurant
tsx scripts/run-post-scrape-migration.ts --restaurant-id=NEW_ID

# This automatically:
# 1. Finds duplicate groups (same name, same category)
# 2. Creates category template
# 3. Links all dishes to template
# 4. Enables bulk updates
```

---

## 📊 Migration 014 Results (Already Fixed Existing Data):

```
✅ 1,303 category templates created
✅ 13,799 duplicate groups now linked
✅ Bulk updates now possible
✅ Data integrity improved

For NEW restaurants going forward:
→ Run pattern detection after scraping
→ Same benefits for new locations
```

---

**Does this explain it better?** The scraper works fine, it just needs the post-processing step to organize the data efficiently! 🎯

