# DATABASE SCHEMA QUICK REFERENCE

**⚠️ AGENT: READ THIS FILE FIRST BEFORE ANY DATABASE QUERIES**

## Database Info
- **Database**: Supabase PostgreSQL ONLY (ignore DATABASE_URL - that's old Neon)
- **Primary Schema**: `menuca_v3` (ALL restaurant data)
- **Admin Schema**: `public` (admin_users, admin_roles only)
- **ALL Supabase clients MUST have**: `db: { schema: 'menuca_v3' }`

## Critical Tables & Columns

### restaurants
```sql
-- IMPORTANT: NO 'slug' column exists!
id                  INTEGER PRIMARY KEY (not UUID!)
uuid                VARCHAR
name                VARCHAR
status              VARCHAR
online_ordering_enabled BOOLEAN
-- Slug format: "{name}-{id}" (e.g., "joes-pizza-636")
-- To get restaurant: extractIdFromSlug(slug) → query by 'id'
```

### restaurant_delivery_zones (menuca_v3 schema)
```sql
id                      INTEGER PRIMARY KEY
restaurant_id           INTEGER
zone_name               VARCHAR
delivery_fee_cents      INTEGER  -- in cents! (500 = $5.00)
minimum_order_cents     INTEGER
is_active               BOOLEAN
deleted_at              TIMESTAMP
```

### dishes
```sql
id                  INTEGER PRIMARY KEY
restaurant_id       INTEGER
name                VARCHAR
description         TEXT
course_id           INTEGER  -- links to menu_courses
is_active           BOOLEAN
-- NO 'prices' JSONB column - use dish_prices table instead
```

### dish_prices (Refactored Schema)
```sql
id              INTEGER PRIMARY KEY
dish_id         INTEGER
price           DECIMAL
size_variant    VARCHAR  -- 'small', 'medium', 'large', 'standard'
is_active       BOOLEAN
-- IMPORTANT: Column is 'size_variant' NOT 'size'!
```

### modifier_groups
```sql
id              INTEGER PRIMARY KEY
dish_id         INTEGER
name            VARCHAR  -- "Size", "Toppings", "Add-ons"
display_order   INTEGER
```

### dish_modifiers (Refactored - Direct pricing)
```sql
id                  INTEGER PRIMARY KEY
modifier_group_id   INTEGER
name                VARCHAR
price               DECIMAL  -- Direct price, NO ingredient FK
is_active           BOOLEAN
```

### orders
```sql
id                          INTEGER PRIMARY KEY
user_id                     INTEGER (nullable - NULL for guests)
is_guest_order              BOOLEAN
guest_email                 VARCHAR
guest_phone                 VARCHAR
guest_name                  VARCHAR
restaurant_id               INTEGER
payment_status              VARCHAR
stripe_payment_intent_id    VARCHAR UNIQUE
total_amount                DECIMAL
subtotal                    DECIMAL
delivery_fee                DECIMAL
tax_amount                  DECIMAL
items                       JSONB  -- validated cart items
delivery_address            JSONB
-- IMPORTANT: NO 'status' column! Use order_status_history table
```

## Common Mistakes to AVOID

❌ **DON'T**: Query restaurants by 'slug' column (doesn't exist)
✅ **DO**: Extract ID from slug with `extractIdFromSlug()`, query by 'id'

❌ **DON'T**: Try to join `restaurant_service_configs` from menuca_v3
✅ **DO**: Use `restaurant_delivery_zones` for delivery fees

❌ **DON'T**: Query `dish_prices` with 'size' column
✅ **DO**: Use 'size_variant' column name

❌ **DON'T**: Assume delivery fee is in `restaurant_service_configs`
✅ **DO**: Get it from `restaurant_delivery_zones.delivery_fee_cents`

❌ **DON'T**: Set `orders.status` column (doesn't exist)
✅ **DO**: Use `order_status_history` table for status tracking

## Before Writing ANY Database Code

1. ✅ Read this file
2. ✅ Check SUPABASE_CONFIG.md for connection details
3. ✅ Use `execute_sql_tool` to verify table/column names
4. ✅ Don't assume - VERIFY first!

## Secrets Available
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- TESTING_STRIPE_SECRET_KEY
- VITE_STRIPE_PUBLIC_KEY
- RESEND_API_KEY

Last Updated: November 19, 2025
