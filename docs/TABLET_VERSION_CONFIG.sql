-- Tablet app version gating configuration
-- Run once in Supabase SQL editor (menuca_v3 schema)

create table if not exists menuca_v3.tablet_app_versions (
  id bigserial primary key,
  min_version text not null,
  latest_version text,
  required boolean default true,
  message text,
  update_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tablet_app_versions_active
  on menuca_v3.tablet_app_versions (is_active, created_at desc);

-- Example row (edit values as needed)
insert into menuca_v3.tablet_app_versions (min_version, latest_version, required, message, update_url, is_active)
values ('1.4.1', '1.4.5', true, 'Update required to continue receiving orders.', 'market://details?id=ca.menu.orders', true);
