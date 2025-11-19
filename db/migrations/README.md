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

## 2. Restaurant Branding Columns

**File**: `add_restaurant_branding_columns.sql`

```sql
-- Add branding columns to restaurants table
ALTER TABLE restaurants 
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#666666',
  ADD COLUMN IF NOT EXISTS font_family VARCHAR(100) DEFAULT 'Inter';

-- Add comment
COMMENT ON COLUMN restaurants.logo_url IS 'URL to restaurant logo image in Supabase Storage';
COMMENT ON COLUMN restaurants.primary_color IS 'Primary brand color (hex format)';
COMMENT ON COLUMN restaurants.secondary_color IS 'Secondary brand color (hex format)';
COMMENT ON COLUMN restaurants.font_family IS 'Brand font family name';
```

**Status**: ⚠️ Required for Branding tab to function

**Note**: You also need to create the `restaurant-logos` storage bucket in Supabase:
1. Go to Storage in Supabase Dashboard
2. Create new bucket named `restaurant-logos`
3. Set it to Public

---

## 3. Restaurant SEO Table

**File**: `restaurant_seo.sql`

```sql
-- Create restaurant_seo table
CREATE TABLE IF NOT EXISTS restaurant_seo (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE UNIQUE,
  meta_title VARCHAR(60),
  meta_description VARCHAR(160),
  og_title VARCHAR(60),
  og_description VARCHAR(160),
  og_image_url TEXT,
  include_in_sitemap BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_restaurant_seo_restaurant_id ON restaurant_seo(restaurant_id);

-- Add comment
COMMENT ON TABLE restaurant_seo IS 'SEO metadata and Open Graph tags for restaurant pages';
```

**Status**: ⚠️ Required for SEO tab to function

---

## 4. Restaurant Feedback Table

**File**: `restaurant_feedback.sql`

```sql
-- Create restaurant_feedback table for customer reviews and admin responses
CREATE TABLE IF NOT EXISTS restaurant_feedback (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_response TEXT,
  response_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_restaurant_feedback_restaurant_id ON restaurant_feedback(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_feedback_rating ON restaurant_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_restaurant_feedback_created_at ON restaurant_feedback(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE restaurant_feedback ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read all feedback
CREATE POLICY "Allow authenticated users to read feedback" ON restaurant_feedback
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy for authenticated users to insert feedback
CREATE POLICY "Allow authenticated users to insert feedback" ON restaurant_feedback
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update admin responses
CREATE POLICY "Allow authenticated users to update admin responses" ON restaurant_feedback
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

**Status**: ⚠️ Required for Feedback tab to function

---

## Migration Status Checklist

- [ ] restaurant_integrations - Required for Integrations tab
- [ ] add_restaurant_branding_columns - Required for Branding tab
- [ ] restaurant_seo - Required for SEO tab
- [ ] restaurant_feedback - Required for Feedback tab
- [ ] restaurant_custom_css - Required for Custom CSS tab (coming soon)

---

## Notes

- All migrations use `IF NOT EXISTS` to prevent errors if tables already exist
- Foreign key constraints ensure data integrity
- Indexes are created for optimal query performance
- JSONB columns allow flexible configuration storage
