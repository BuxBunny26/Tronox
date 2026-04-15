-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

-- Enable RLS on all tables
alter table plants enable row level security;
alter table planner_groups enable row level security;
alter table work_centres enable row level security;
alter table functional_locations enable row level security;
alter table delay_codes enable row level security;
alter table profiles enable row level security;
alter table job_cards enable row level security;
alter table job_card_operations enable row level security;
alter table job_card_equipment enable row level security;
alter table job_card_completions enable row level security;
alter table job_card_delays enable row level security;
alter table job_card_downtime enable row level security;

-- Helper function to get current user role
create or replace function get_my_role()
returns text as $$
  select role::text from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Helper function: get current user plant_id
create or replace function get_my_plant_id()
returns uuid as $$
  select plant_id from profiles where id = auth.uid();
$$ language sql security definer stable;

-- ============================================================
-- REFERENCE TABLES: authenticated users can read, admin writes
-- ============================================================

create policy "All authenticated can read plants"
  on plants for select to authenticated using (true);
create policy "Admin manages plants"
  on plants for all to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "All authenticated can read planner_groups"
  on planner_groups for select to authenticated using (true);
create policy "Admin manages planner_groups"
  on planner_groups for all to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "All authenticated can read work_centres"
  on work_centres for select to authenticated using (true);
create policy "Admin manages work_centres"
  on work_centres for all to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "All authenticated can read functional_locations"
  on functional_locations for select to authenticated using (true);
create policy "Admin manages functional_locations"
  on functional_locations for all to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "All authenticated can read delay_codes"
  on delay_codes for select to authenticated using (true);

-- ============================================================
-- PROFILES
-- ============================================================

-- Everyone can read all profiles (for assignment dropdowns)
create policy "Authenticated can read profiles"
  on profiles for select to authenticated using (true);

-- Users can update their own profile (basic info only)
create policy "Users update own profile"
  on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin can update any profile (for role management)
create policy "Admin manages all profiles"
  on profiles for all to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- ============================================================
-- JOB CARDS
-- ============================================================

-- Read policies
create policy "Admin/Planner/Supervisor/Analyst see all job cards"
  on job_cards for select to authenticated
  using (get_my_role() in ('admin', 'planner', 'supervisor', 'analyst'));

create policy "Artisan sees own assigned job cards"
  on job_cards for select to authenticated
  using (get_my_role() = 'artisan' and assigned_to = auth.uid());

create policy "Client sees plant job cards"
  on job_cards for select to authenticated
  using (get_my_role() = 'client' and plant_id = get_my_plant_id());

-- Write policies
create policy "Planner and Admin create job cards"
  on job_cards for insert to authenticated
  with check (get_my_role() in ('admin', 'planner'));

create policy "Planner/Admin/Supervisor update job cards"
  on job_cards for update to authenticated
  using (get_my_role() in ('admin', 'planner', 'supervisor'));

create policy "Admin deletes job cards"
  on job_cards for delete to authenticated
  using (get_my_role() = 'admin');

-- ============================================================
-- JOB CARD SUB-TABLES (inherit from job card access)
-- ============================================================

-- Helper: can user access a job card's data?
create policy "job_card_operations select"
  on job_card_operations for select to authenticated
  using (
    exists (
      select 1 from job_cards jc where jc.id = job_card_id
      and (
        get_my_role() in ('admin', 'planner', 'supervisor', 'analyst')
        or (get_my_role() = 'artisan' and jc.assigned_to = auth.uid())
        or (get_my_role() = 'client' and jc.plant_id = get_my_plant_id())
      )
    )
  );
create policy "job_card_operations write"
  on job_card_operations for all to authenticated
  using (get_my_role() in ('admin', 'planner', 'supervisor'))
  with check (get_my_role() in ('admin', 'planner', 'supervisor'));

create policy "job_card_equipment select"
  on job_card_equipment for select to authenticated
  using (
    exists (
      select 1 from job_cards jc where jc.id = job_card_id
      and (
        get_my_role() in ('admin', 'planner', 'supervisor', 'analyst')
        or (get_my_role() = 'artisan' and jc.assigned_to = auth.uid())
        or (get_my_role() = 'client' and jc.plant_id = get_my_plant_id())
      )
    )
  );
create policy "job_card_equipment write"
  on job_card_equipment for all to authenticated
  using (get_my_role() in ('admin', 'planner', 'supervisor'))
  with check (get_my_role() in ('admin', 'planner', 'supervisor'));

-- Completions: artisans and above can write
create policy "job_card_completions select"
  on job_card_completions for select to authenticated
  using (
    exists (
      select 1 from job_cards jc where jc.id = job_card_id
      and (
        get_my_role() in ('admin', 'planner', 'supervisor', 'analyst')
        or (get_my_role() = 'artisan' and jc.assigned_to = auth.uid())
        or (get_my_role() = 'client' and jc.plant_id = get_my_plant_id())
      )
    )
  );
create policy "job_card_completions write"
  on job_card_completions for all to authenticated
  using (
    get_my_role() in ('admin', 'planner', 'supervisor')
    or (
      get_my_role() = 'artisan'
      and exists (select 1 from job_cards jc where jc.id = job_card_id and jc.assigned_to = auth.uid())
    )
  )
  with check (
    get_my_role() in ('admin', 'planner', 'supervisor')
    or (
      get_my_role() = 'artisan'
      and exists (select 1 from job_cards jc where jc.id = job_card_id and jc.assigned_to = auth.uid())
    )
  );

create policy "job_card_delays select"
  on job_card_delays for select to authenticated
  using (
    exists (
      select 1 from job_cards jc where jc.id = job_card_id
      and (
        get_my_role() in ('admin', 'planner', 'supervisor', 'analyst')
        or (get_my_role() = 'artisan' and jc.assigned_to = auth.uid())
        or (get_my_role() = 'client' and jc.plant_id = get_my_plant_id())
      )
    )
  );
create policy "job_card_delays write"
  on job_card_delays for all to authenticated
  using (
    get_my_role() in ('admin', 'planner', 'supervisor')
    or (get_my_role() = 'artisan' and exists (select 1 from job_cards jc where jc.id = job_card_id and jc.assigned_to = auth.uid()))
  )
  with check (
    get_my_role() in ('admin', 'planner', 'supervisor')
    or (get_my_role() = 'artisan' and exists (select 1 from job_cards jc where jc.id = job_card_id and jc.assigned_to = auth.uid()))
  );

create policy "job_card_downtime select"
  on job_card_downtime for select to authenticated
  using (
    exists (
      select 1 from job_cards jc where jc.id = job_card_id
      and (
        get_my_role() in ('admin', 'planner', 'supervisor', 'analyst')
        or (get_my_role() = 'artisan' and jc.assigned_to = auth.uid())
        or (get_my_role() = 'client' and jc.plant_id = get_my_plant_id())
      )
    )
  );
create policy "job_card_downtime write"
  on job_card_downtime for all to authenticated
  using (
    get_my_role() in ('admin', 'planner', 'supervisor')
    or (get_my_role() = 'artisan' and exists (select 1 from job_cards jc where jc.id = job_card_id and jc.assigned_to = auth.uid()))
  )
  with check (
    get_my_role() in ('admin', 'planner', 'supervisor')
    or (get_my_role() = 'artisan' and exists (select 1 from job_cards jc where jc.id = job_card_id and jc.assigned_to = auth.uid()))
  );

-- Grant analytics view access
grant select on job_card_analytics to authenticated;
