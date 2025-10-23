-- Demo Database Setup for Menu.ca Dashboard
-- This creates tables and seeds demo data for the Replit database

-- Drop existing tables if they exist
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS dishes CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS restaurant_service_configs CASCADE;
DROP TABLE IF EXISTS restaurant_schedules CASCADE;
DROP TABLE IF EXISTS restaurant_locations CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Restaurants table
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Restaurant Locations
CREATE TABLE restaurant_locations (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  street_address VARCHAR(255),
  city_id INTEGER,
  postal_code VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  is_primary BOOLEAN DEFAULT false
);

-- Restaurant Schedules
CREATE TABLE restaurant_schedules (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  type VARCHAR(50),
  day_start INTEGER,
  day_stop INTEGER,
  time_start TIME,
  time_stop TIME,
  is_enabled BOOLEAN DEFAULT true
);

-- Restaurant Service Config
CREATE TABLE restaurant_service_configs (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  has_delivery_enabled BOOLEAN DEFAULT true,
  delivery_time_minutes INTEGER DEFAULT 45,
  delivery_min_order DECIMAL(10,2) DEFAULT 15.00,
  delivery_max_distance_km DECIMAL(10,2) DEFAULT 10.00,
  delivery_fee_cents INTEGER DEFAULT 500,
  takeout_enabled BOOLEAN DEFAULT true,
  takeout_time_minutes INTEGER DEFAULT 20,
  accepts_tips BOOLEAN DEFAULT true
);

-- Courses (Menu Categories)
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Dishes
CREATE TABLE dishes (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  has_customization BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  prices JSONB,
  size_options JSONB
);

-- Orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  restaurant_id INTEGER REFERENCES restaurants(id),
  status VARCHAR(50) DEFAULT 'pending',
  subtotal DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  tip DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  delivery_address TEXT,
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  dish_id INTEGER REFERENCES dishes(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  customizations JSONB,
  subtotal DECIMAL(10,2) NOT NULL
);

-- Seed Demo Data
-- Insert 10 demo users
INSERT INTO users (email, first_name, last_name, phone) VALUES
  ('john.doe@example.com', 'John', 'Doe', '416-555-0101'),
  ('jane.smith@example.com', 'Jane', 'Smith', '647-555-0102'),
  ('mike.johnson@example.com', 'Mike', 'Johnson', '416-555-0103'),
  ('sarah.williams@example.com', 'Sarah', 'Williams', '647-555-0104'),
  ('david.brown@example.com', 'David', 'Brown', '416-555-0105'),
  ('emily.davis@example.com', 'Emily', 'Davis', '647-555-0106'),
  ('james.miller@example.com', 'James', 'Miller', '416-555-0107'),
  ('olivia.wilson@example.com', 'Olivia', 'Wilson', '647-555-0108'),
  ('robert.moore@example.com', 'Robert', 'Moore', '416-555-0109'),
  ('sophia.taylor@example.com', 'Sophia', 'Taylor', '647-555-0110');

-- Insert 15 demo restaurants
INSERT INTO restaurants (name, slug, description, status) VALUES
  ('Naked Fish Sushi', 'naked-fish-sushi', 'Premium Japanese sushi and sashimi restaurant', 'active'),
  ('Pizza Nova', 'pizza-nova', 'Family-friendly Italian pizza and pasta', 'active'),
  ('Burger Shack', 'burger-shack', 'Gourmet burgers and fries', 'active'),
  ('Thai Express', 'thai-express', 'Authentic Thai cuisine', 'active'),
  ('Golden Dragon', 'golden-dragon', 'Traditional Chinese food', 'active'),
  ('Pho King', 'pho-king', 'Vietnamese noodle house', 'active'),
  ('Taco Fiesta', 'taco-fiesta', 'Mexican street food', 'active'),
  ('Curry House', 'curry-house', 'Indian cuisine and tandoori', 'active'),
  ('Mediterranean Grill', 'mediterranean-grill', 'Fresh Mediterranean dishes', 'active'),
  ('Sushi Express', 'sushi-express', 'Quick Japanese takeout', 'active'),
  ('The Steakhouse', 'the-steakhouse', 'Premium steaks and seafood', 'active'),
  ('Veggie Delight', 'veggie-delight', 'Healthy vegetarian options', 'active'),
  ('Pasta Paradise', 'pasta-paradise', 'Handmade Italian pasta', 'active'),
  ('BBQ Pit', 'bbq-pit', 'Smoked meats and ribs', 'active'),
  ('Fish & Chips Co', 'fish-chips-co', 'Classic fish and chips', 'active');

-- Insert restaurant locations
INSERT INTO restaurant_locations (restaurant_id, street_address, city_id, postal_code, phone, is_primary)
SELECT id, 
  CONCAT(100 + id * 10, ' Queen Street West'), 
  1, 
  CONCAT('M', LPAD((5000 + id)::text, 4, '0')), 
  CONCAT('416-555-', LPAD((1000 + id)::text, 4, '0')),
  true
FROM restaurants;

-- Insert service configs
INSERT INTO restaurant_service_configs (restaurant_id, has_delivery_enabled, delivery_time_minutes, delivery_fee_cents, takeout_enabled)
SELECT id, true, 30 + (id % 3) * 15, 399 + (id % 3) * 100, true
FROM restaurants;

-- Insert restaurant schedules (Mon-Sun, 11am-10pm)
INSERT INTO restaurant_schedules (restaurant_id, type, day_start, day_stop, time_start, time_stop, is_enabled)
SELECT id, 'regular', 1, 7, '11:00:00', '22:00:00', true
FROM restaurants;

-- Insert courses for each restaurant
INSERT INTO courses (restaurant_id, name, description, display_order)
SELECT r.id, 'Appetizers', 'Start your meal right', 1 FROM restaurants r
UNION ALL
SELECT r.id, 'Main Dishes', 'Our signature dishes', 2 FROM restaurants r
UNION ALL
SELECT r.id, 'Desserts', 'Sweet endings', 3 FROM restaurants r
UNION ALL
SELECT r.id, 'Drinks', 'Beverages and more', 4 FROM restaurants r;

-- Insert sample dishes (3 per course per restaurant)
WITH course_data AS (
  SELECT c.id as course_id, c.restaurant_id, c.name as course_name,
    ROW_NUMBER() OVER (PARTITION BY c.restaurant_id ORDER BY c.display_order) as course_num
  FROM courses c
)
INSERT INTO dishes (course_id, name, description, base_price, is_active)
SELECT 
  course_id,
  CASE course_num
    WHEN 1 THEN CASE (course_id % 3)
      WHEN 0 THEN 'Spring Rolls'
      WHEN 1 THEN 'Garlic Bread'
      ELSE 'Soup of the Day'
    END
    WHEN 2 THEN CASE (course_id % 3)
      WHEN 0 THEN 'Grilled Chicken'
      WHEN 1 THEN 'Beef Burger'
      ELSE 'Veggie Pasta'
    END
    WHEN 3 THEN CASE (course_id % 3)
      WHEN 0 THEN 'Chocolate Cake'
      WHEN 1 THEN 'Ice Cream'
      ELSE 'Tiramisu'
    END
    ELSE CASE (course_id % 3)
      WHEN 0 THEN 'Soft Drink'
      WHEN 1 THEN 'Fresh Juice'
      ELSE 'Coffee'
    END
  END,
  'Delicious and fresh',
  CASE course_num
    WHEN 1 THEN 8.99
    WHEN 2 THEN 16.99
    WHEN 3 THEN 6.99
    ELSE 3.99
  END,
  true
FROM course_data;

-- Insert 50 demo orders with realistic data
WITH order_dates AS (
  SELECT 
    generate_series(1, 50) as order_num,
    NOW() - (random() * interval '30 days') as order_time
)
INSERT INTO orders (user_id, restaurant_id, status, subtotal, delivery_fee, tax, tip, total, created_at)
SELECT 
  1 + (order_num % 10),  -- Cycle through users
  1 + (order_num % 15),  -- Cycle through restaurants
  CASE (order_num % 5)
    WHEN 0 THEN 'delivered'
    WHEN 1 THEN 'out_for_delivery'
    WHEN 2 THEN 'preparing'
    WHEN 3 THEN 'confirmed'
    ELSE 'pending'
  END,
  25.00 + (random() * 75)::numeric(10,2),  -- Subtotal $25-$100
  4.99,  -- Delivery fee
  (25.00 + (random() * 75)) * 0.13,  -- 13% tax
  (25.00 + (random() * 75)) * 0.15,  -- 15% tip
  (25.00 + (random() * 75)) * 1.28 + 4.99,  -- Total with tax + tip + delivery
  order_time
FROM order_dates;

-- Update order totals to be accurate
UPDATE orders SET total = subtotal + delivery_fee + tax + tip;
