-- Add health telemetry columns to devices table (all nullable, won't break existing rows)
ALTER TABLE menuca_v3.devices ADD COLUMN IF NOT EXISTS last_successful_fetch timestamptz;
ALTER TABLE menuca_v3.devices ADD COLUMN IF NOT EXISTS consecutive_fetch_failures integer DEFAULT 0;
ALTER TABLE menuca_v3.devices ADD COLUMN IF NOT EXISTS oldest_pending_order_minutes integer DEFAULT 0;
ALTER TABLE menuca_v3.devices ADD COLUMN IF NOT EXISTS battery_level integer;
ALTER TABLE menuca_v3.devices ADD COLUMN IF NOT EXISTS printer_status text;
ALTER TABLE menuca_v3.devices ADD COLUMN IF NOT EXISTS app_version text DEFAULT 'unknown';

-- Create recovery commands table
CREATE TABLE IF NOT EXISTS menuca_v3.device_recovery_commands (
  id serial PRIMARY KEY,
  device_id integer NOT NULL REFERENCES menuca_v3.devices(id) ON DELETE CASCADE,
  command_id text UNIQUE NOT NULL,
  action text NOT NULL CHECK (action IN ('resync', 'reload_app')),
  reason text,
  issued_by text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz,
  execution_status text NOT NULL DEFAULT 'pending' CHECK (execution_status IN ('pending', 'executed', 'expired', 'failed')),
  execution_result text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_recovery_commands_device_id ON menuca_v3.device_recovery_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_device_recovery_commands_status ON menuca_v3.device_recovery_commands(execution_status);
