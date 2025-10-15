# Database Migrations Required

These SQL migrations need to be run manually in your Supabase SQL Editor to create the necessary tables for the new restaurant management features.

## How to Run Migrations

1. Go to your Supabase Dashboard: https://nthpbtdjhhnwfxqsxbvy.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste each migration SQL below
4. Click **Run** to execute

---

## 1. Restaurant Integrations Table

**File**: `restaurant_integrations.sql`

```sql
-- Create restaurant_integrations table
CREATE TABLE IF NOT EXISTS restaurant_integrations (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('POS', 'PAYMENT', 'DELIVERY', 'OTHER')),
  provider_name VARCHAR(100),
  api_key TEXT,
  api_secret TEXT,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_restaurant_integrations_restaurant_id 
  ON restaurant_integrations(restaurant_id);

-- Add comment
COMMENT ON TABLE restaurant_integrations IS 'Third-party integrations for restaurants (POS, Payment, Delivery systems)';
```

**Status**: ⚠️ Required for Integrations tab to function

---

## Migration Status Checklist

- [ ] restaurant_integrations - Required for Integrations tab
- [ ] restaurant_seo - Required for SEO tab (coming soon)
- [ ] restaurant_custom_css - Required for Custom CSS tab (coming soon)

---

## Notes

- All migrations use `IF NOT EXISTS` to prevent errors if tables already exist
- Foreign key constraints ensure data integrity
- Indexes are created for optimal query performance
- JSONB columns allow flexible configuration storage
