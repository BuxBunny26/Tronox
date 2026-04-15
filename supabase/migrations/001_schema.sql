-- ============================================================
-- Tronox Condition Monitoring Portal — Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enums
create type user_role as enum ('admin', 'planner', 'supervisor', 'artisan', 'analyst', 'client');
create type job_card_status as enum ('draft', 'open', 'in_progress', 'completed', 'closed', 'cancelled');

-- ============================================================
-- REFERENCE / LOOKUP TABLES
-- ============================================================

create table plants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table planner_groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text,
  plant_id uuid references plants(id) on delete set null
);

create table work_centres (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text,
  plant_id uuid references plants(id) on delete set null
);

create table functional_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  plant_id uuid references plants(id) on delete set null
);

create table delay_codes (
  code text primary key,
  category text not null check (category in ('delay', 'not_done')),
  description text not null
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  employee_number text,
  role user_role not null default 'artisan',
  plant_id uuid references plants(id) on delete set null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'artisan');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- JOB CARDS
-- ============================================================

create table job_cards (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  date_printed date not null default current_date,
  basic_start_date date,
  operation_must_start_date date,
  created_by_employee text,
  -- Functional location (fk or free text for flexibility)
  functional_location_id uuid references functional_locations(id) on delete set null,
  functional_location_text text,
  alternative_label text,
  equipment text,
  order_priority text,
  criticality text,
  planner_group_id uuid references planner_groups(id) on delete set null,
  planner_group_text text,
  package_used text,
  main_work_centre_id uuid references work_centres(id) on delete set null,
  main_work_centre_text text,
  counter_reading text,
  planned_duration numeric(10,2) default 0,
  maintenance_activity_type text,
  description_of_work_order text,
  plant_id uuid references plants(id) on delete set null,
  status job_card_status not null default 'open',
  assigned_to uuid references profiles(id) on delete set null,
  rams_feedback text,
  notes text,
  created_by_user_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Operations (Opr No table from the SAP export)
create table job_card_operations (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid references job_cards(id) on delete cascade not null,
  opr_no text,
  ctrl_key text,
  res_req text,
  work_c text,
  system_condition text,
  employee_no text,
  description text,
  sort_order int default 0
);

-- Equipment / Functional Location list per job card
create table job_card_equipment (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid references job_cards(id) on delete cascade not null,
  functional_location_code text not null,
  description text,
  sort_order int default 0
);

-- Completion data
create table job_card_completions (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid references job_cards(id) on delete cascade not null unique,
  actual_working_hours numeric(10,2),
  task_start_datetime timestamptz,
  task_end_datetime timestamptz,
  create_notification boolean,
  notification_text text,
  additional_work_required text,
  task_completed boolean,
  counter_readings text,
  completed_by uuid references profiles(id) on delete set null,
  completed_at timestamptz,
  supervisor_id uuid references profiles(id) on delete set null,
  supervised_at timestamptz,
  notes text
);

-- Delay / Not-Done codes per job card
create table job_card_delays (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid references job_cards(id) on delete cascade not null,
  delay_code text references delay_codes(code),
  duration_hours numeric(10,2),
  notes text
);

-- Downtime events per job card
create table job_card_downtime (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid references job_cards(id) on delete cascade not null,
  is_breakdown boolean default false,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  -- Computed duration in hours (stored for fast querying)
  duration_hours numeric(10,2) generated always as (
    case when started_at is not null and ended_at is not null
    then extract(epoch from (ended_at - started_at)) / 3600
    else null end
  ) stored
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_job_cards_status on job_cards(status);
create index idx_job_cards_plant on job_cards(plant_id);
create index idx_job_cards_assigned on job_cards(assigned_to);
create index idx_job_cards_basic_start on job_cards(basic_start_date);
create index idx_job_cards_created on job_cards(created_at desc);
create index idx_equipment_job_card on job_card_equipment(job_card_id);
create index idx_operations_job_card on job_card_operations(job_card_id);
create index idx_delays_job_card on job_card_delays(job_card_id);
create index idx_downtime_job_card on job_card_downtime(job_card_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_job_cards_updated_at
  before update on job_cards
  for each row execute procedure update_updated_at();

create trigger update_profiles_updated_at
  before update on profiles
  for each row execute procedure update_updated_at();

-- ============================================================
-- ANALYTICS VIEW (convenience)
-- ============================================================

create or replace view job_card_analytics as
select
  jc.id,
  jc.order_no,
  jc.status,
  jc.plant_id,
  p.name as plant_name,
  p.code as plant_code,
  jc.basic_start_date,
  jc.planned_duration,
  jc.maintenance_activity_type,
  jc.package_used,
  jc.order_priority,
  jc.created_at,
  jcc.actual_working_hours,
  jcc.task_start_datetime,
  jcc.task_end_datetime,
  jcc.task_completed,
  -- Overdue: open/in_progress cards past their basic_start_date
  case
    when jc.status in ('open', 'in_progress')
     and jc.basic_start_date < current_date
    then true else false
  end as is_overdue,
  -- Duration variance
  case
    when jcc.actual_working_hours is not null and jc.planned_duration > 0
    then jcc.actual_working_hours - jc.planned_duration
    else null
  end as duration_variance,
  (select count(*) from job_card_delays d where d.job_card_id = jc.id) as delay_count,
  (select count(*) from job_card_downtime dt where dt.job_card_id = jc.id) as downtime_events,
  (select coalesce(sum(dt.duration_hours), 0) from job_card_downtime dt where dt.job_card_id = jc.id) as total_downtime_hours
from job_cards jc
left join plants p on p.id = jc.plant_id
left join job_card_completions jcc on jcc.job_card_id = jc.id;
