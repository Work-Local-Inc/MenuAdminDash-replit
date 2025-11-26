# 🔄 Future Scrape Migration Guide

## Overview

After the initial category template migration (Option B), all future restaurant scrapes must follow this new process to properly create category templates instead of leaving all modifiers as dish-level.

---

## 🆚 Old vs New Approach

### OLD Way (Before Category Templates):
```
Scrape → Create dish-level modifiers → Done
Result: All custom, no reusability, hard to update
```

### NEW Way (With Category Templates):
```
Scrape → Create dish-level (temporary) → Detect patterns → Create templates → Link dishes
Result: Category-level templates + custom exceptions, easy bulk updates
```

---

## 📋 Step-by-Step Process

### Step 1: Initial Scrape (Unchanged)

Your existing scraper works fine - continue scraping modifiers as dish-level:

```javascript
// Existing scrape logic (no changes needed)
for (const dish of dishes) {
  await createDish(dish);
  
  for (const modifierGroup of dish.modifierGroups) {
    // Create as dish-level initially
    const group = await db.modifier_groups.insert({
      dish_id: dish.id,
      name: modifierGroup.name,
      is_custom: true,  // Temporary
      course_template_id: null
    });
    
    for (const modifier of modifierGroup.modifiers) {
      await db.dish_modifiers.insert({
        modifier_group_id: group.id,
        name: modifier.name,
        price: modifier.price
      });
    }
  }
}
```

**Why?** Safe fallback. If pattern detection fails, modifiers still exist at dish-level.

---

### Step 2: Run Pattern Detection (NEW)

After scraping completes, run the pattern detection script:

```bash
# Replace 123 with actual restaurant_id
tsx scripts/run-post-scrape-migration.ts --restaurant-id=123
```

Or directly in SQL:
```sql
-- Copy scripts/post-scrape-template-migration.sql
-- Replace @RESTAURANT_ID with actual ID
-- Run in Supabase SQL Editor
```

**What it does:**
1. Analyzes all dishes in the new restaurant
2. Finds modifier groups that appear on 80%+ of dishes in each category
3. Creates category templates from patterns
4. Links dishes to templates
5. Reports outliers (dishes missing common groups)

---

### Step 3: Review Outliers (IMPORTANT)

The script will output something like:

```
Outliers to review:
┌─────────┬────────────────────┬──────────────────────┐
│ Category│ Dish Missing Group │ Should Have This     │
├─────────┼────────────────────┼──────────────────────┤
│ Pizza   │ One Topping        │ Dips                 │
│ Pizza   │ Gluten Free        │ Crust Type           │
└─────────┴────────────────────┴──────────────────────┘
```

**Action Required:**
- Check the live menu for these dishes
- If they SHOULD have the group → Add it manually
- If they're intentionally different → Leave as is

---

### Step 4: Add Missing Groups (If Needed)

If outlier dishes should have the group (like the Milano "One Topping" example):

```sql
-- Get the template ID
SELECT id FROM course_modifier_templates 
WHERE course_id = [category_id] AND name = 'Dips';
-- Result: template_id = 456

-- Create the missing group and link to template
INSERT INTO modifier_groups (
  dish_id, course_template_id, name, 
  is_required, min_selections, max_selections, is_custom
)
SELECT 
  [outlier_dish_id], 456, 'Dips',
  t.is_required, t.min_selections, t.max_selections, false
FROM course_modifier_templates t
WHERE t.id = 456;
```

---

## 🎯 Example Workflow

### Real Example: Scraping "New Pizza Place"

```bash
# 1. Run scraper (existing code)
npm run scrape -- --restaurant="New Pizza Place"
# Result: Restaurant ID 9876, 50 dishes, 300 modifier groups (all dish-level)

# 2. Run pattern detection
tsx scripts/run-post-scrape-migration.ts --restaurant-id=9876
# Output:
#   ✓ Found 6 patterns (80%+ match)
#   ✓ Created 6 category templates
#   ✓ Linked 287 groups to templates
#   ⚠️  13 outliers need review

# 3. Review outliers
# Script shows:
#   Pizza | Build Your Own | Dips (missing on 1/25 dishes)
#   Pizza | Kids Pizza     | Crust Type (missing on 1/25 dishes)

# 4. Check live menu
# "Build Your Own" SHOULD have dips → Add it
# "Kids Pizza" intentionally has regular crust only → Leave it

# 5. Fix the outlier
# Add "Dips" group to "Build Your Own" dish
# Link to template (SQL above)

# 6. Verify in admin dashboard
# ✅ Category templates show inherited dishes
# ✅ Bulk update works (change template → all dishes update)
```

---

## ⚠️ Important Notes

### When to Run Pattern Detection:

**✅ Run after:**
- Scraping a NEW restaurant
- Migrating restaurant from v1/v2 to v3
- Major menu update (many dishes added)

**❌ Don't run for:**
- Adding 1-2 dishes to existing restaurant
- Updating prices (doesn't affect structure)
- Changing dish names

### Match Threshold (80%):

**Why 80% and not 100%?**
- Catches migration errors (like Milano "One Topping")
- Most "missing" groups are bugs, not intentional
- Outliers flagged for manual review

**80% means:**
```
Category has 10 dishes
8+ dishes have "Dips" group → Create template
7 or fewer → Keep as custom
```

### Safety Features:

1. **Dish-level fallback**: Scrape always creates dish-level first
2. **Pattern detection is additive**: Only upgrades to templates, never removes data
3. **Outlier reporting**: Flags issues for human review
4. **Reversible**: Can break inheritance anytime

---

## 🔧 Troubleshooting

### "No patterns detected"

**Possible causes:**
- Restaurant has very custom menu (each dish unique)
- Categories have <3 dishes
- Each dish has different modifiers

**Solution:** That's fine! Leave as dish-level (is_custom=true)

### "Too many outliers"

**If >20% of dishes are outliers:**
- Menu might be highly customized per-dish
- Check if scrape was accurate
- Consider if this restaurant should use templates at all

### "Template created but dishes still show custom"

**Check:**
```sql
-- Verify template was created
SELECT * FROM course_modifier_templates WHERE course_id = [id];

-- Verify groups are linked
SELECT * FROM modifier_groups 
WHERE course_template_id = [template_id];

-- If not linked, run linking manually
UPDATE modifier_groups 
SET course_template_id = [template_id], is_custom = false
WHERE id IN ([group_ids]);
```

---

## 📊 Monitoring

After migration, check these metrics:

```sql
-- For specific restaurant
SELECT 
  (SELECT COUNT(*) FROM modifier_groups mg
   INNER JOIN dishes d ON d.id = mg.dish_id
   INNER JOIN courses c ON c.id = d.course_id
   WHERE c.restaurant_id = [id] AND mg.is_custom = false) as template_linked,
   
  (SELECT COUNT(*) FROM modifier_groups mg
   INNER JOIN dishes d ON d.id = mg.dish_id
   INNER JOIN courses c ON c.id = d.course_id
   WHERE c.restaurant_id = [id] AND mg.is_custom = true) as custom_groups;
```

**Healthy ratios:**
- 60-80% template-linked = Great (most groups follow patterns)
- 40-60% template-linked = Good (some patterns, some custom)
- <40% template-linked = Check outliers (might be migration issues)

---

## 📝 Summary for Devs

**After every new restaurant scrape:**

1. ✅ Scrape completes normally (no code changes)
2. ✅ Run `tsx scripts/run-post-scrape-migration.ts --restaurant-id=X`
3. ✅ Review outlier report
4. ✅ Add missing groups where needed
5. ✅ Verify in admin dashboard

**That's it!** The new system will maintain itself going forward. Category templates make bulk updates easy and keep menus consistent.

---

## 🆘 Need Help?

If pattern detection doesn't work as expected:
1. Check the outlier report (often explains the issue)
2. Verify the scraped data is correct
3. Run manual SQL to inspect patterns
4. Consider if this restaurant is too custom for templates

**Questions?** Refer to:
- `migrations/014_auto_create_category_templates.sql` - Main migration
- `scripts/post-scrape-template-migration.sql` - Per-restaurant script
- `FOR_REPLIT_AGENT.md` - UI implementation guide

