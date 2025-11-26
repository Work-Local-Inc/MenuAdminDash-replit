-- Migration: Create device_sessions table for tablet authentication
-- Date: November 26, 2025
-- Purpose: Enable secure session management for tablet bridge app

-- ============================================
-- 1. Create device_sessions table
-- ============================================

CREATE TABLE IF NOT EXISTS menuca_v3.device_sessions (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES menuca_v3.devices(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_device_sessions_token
  ON menuca_v3.device_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_device_sessions_device
  ON menuca_v3.device_sessions(device_id);

CREATE INDEX IF NOT EXISTS idx_device_sessions_expires
  ON menuca_v3.device_sessions(expires_at);

-- ============================================
-- 2. Add device acknowledgment columns to orders
-- ============================================

-- Track which device acknowledged the order and when
ALTER TABLE menuca_v3.orders
  ADD COLUMN IF NOT EXISTS acknowledged_by_device_id INTEGER REFERENCES menuca_v3.devices(id),
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE;

-- Index for finding unacknowledged orders
CREATE INDEX IF NOT EXISTS idx_orders_acknowledged
  ON menuca_v3.orders(acknowledged_at)
  WHERE acknowledged_at IS NULL;

-- ============================================
-- 3. Add device configuration table (optional)
-- ============================================

CREATE TABLE IF NOT EXISTS menuca_v3.device_configs (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL UNIQUE REFERENCES menuca_v3.devices(id) ON DELETE CASCADE,
  poll_interval_ms INTEGER DEFAULT 5000,
  auto_print BOOLEAN DEFAULT TRUE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  notification_tone VARCHAR(50) DEFAULT 'default',
  print_customer_copy BOOLEAN DEFAULT TRUE,
  print_kitchen_copy BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. Cleanup function for expired sessions
-- ============================================

CREATE OR REPLACE FUNCTION menuca_v3.cleanup_expired_device_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM menuca_v3.device_sessions
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Optional: Create a scheduled job to run cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-device-sessions', '0 * * * *', 'SELECT menuca_v3.cleanup_expired_device_sessions()');

-- ============================================
-- 5. Comments for documentation
-- ============================================

COMMENT ON TABLE menuca_v3.device_sessions IS 'Session tokens for authenticated tablet devices';
COMMENT ON TABLE menuca_v3.device_configs IS 'Per-device configuration settings for tablet app';
COMMENT ON COLUMN menuca_v3.orders.acknowledged_by_device_id IS 'ID of device that acknowledged this order';
COMMENT ON COLUMN menuca_v3.orders.acknowledged_at IS 'Timestamp when order was acknowledged by tablet';

-- ============================================
-- ROLLBACK COMMANDS (if needed)
-- ============================================
-- DROP TABLE IF EXISTS menuca_v3.device_configs;
-- DROP TABLE IF EXISTS menuca_v3.device_sessions;
-- ALTER TABLE menuca_v3.orders DROP COLUMN IF EXISTS acknowledged_by_device_id;
-- ALTER TABLE menuca_v3.orders DROP COLUMN IF EXISTS acknowledged_at;
-- DROP FUNCTION IF EXISTS menuca_v3.cleanup_expired_device_sessions();
