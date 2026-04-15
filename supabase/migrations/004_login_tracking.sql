-- ============================================================
-- Login Tracking
-- ============================================================

-- Table to record each login event
create table if not exists login_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS
alter table login_events enable row level security;

create policy "Users insert own login events"
  on login_events for insert to authenticated
  with check (user_id = auth.uid());

create policy "Admin reads all login events"
  on login_events for select to authenticated
  using (get_my_role() = 'admin');

-- Function: returns all users with their last_sign_in_at (admin only)
-- Uses security definer to access auth.users
create or replace function admin_get_user_logins()
returns table(
  user_id         uuid,
  email           text,
  full_name       text,
  role            text,
  last_sign_in_at timestamptz,
  created_at      timestamptz,
  is_active       boolean
)
security definer
language sql stable as $$
  select
    p.id,
    au.email,
    p.full_name,
    p.role::text,
    au.last_sign_in_at,
    au.created_at,
    p.is_active
  from auth.users au
  join profiles p on p.id = au.id
  where (select get_my_role()) = 'admin'
  order by au.last_sign_in_at desc nulls last;
$$;
