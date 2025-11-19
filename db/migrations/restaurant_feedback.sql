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
-- NOTE: This currently allows all authenticated users to update admin responses
-- TODO: Restrict to admin role once RBAC is implemented (Phase 3 of build plan)
CREATE POLICY "Allow authenticated users to update admin responses" ON restaurant_feedback
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
