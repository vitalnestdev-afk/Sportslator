-- Sportslator schema (v1)
create type entity_type as enum ('club', 'player');
create type comparison_status as enum ('seed', 'user', 'hidden');
create type dimension_kind as enum ('pedigree', 'trajectory', 'fanbase', 'city', 'aura', 'style');
create type vote_value as enum ('agree', 'disagree');

create table sports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table entities (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references sports(id),
  name text not null,
  slug text not null unique,
  type entity_type not null default 'club',
  primary_color text not null,
  secondary_color text not null,
  crest_url text
);

create table comparisons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  entity_a_id uuid not null references entities(id),
  entity_b_id uuid not null references entities(id),
  verdict_text text not null,
  status comparison_status not null default 'user',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint distinct_entities check (entity_a_id <> entity_b_id)
);

create table comparison_dimensions (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references comparisons(id) on delete cascade,
  dimension dimension_kind not null,
  rationale_text text not null,
  unique (comparison_id, dimension)
);

create table votes (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references comparisons(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  value vote_value not null,
  created_at timestamptz not null default now(),
  unique (comparison_id, user_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references comparisons(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 2000),
  parent_id uuid references comments(id),
  reported_count int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  avatar_url text
);

-- auto-create profile on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  ) on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS
alter table sports enable row level security;
alter table entities enable row level security;
alter table comparisons enable row level security;
alter table comparison_dimensions enable row level security;
alter table votes enable row level security;
alter table comments enable row level security;
alter table profiles enable row level security;

create policy "read sports" on sports for select using (true);
create policy "read entities" on entities for select using (true);
create policy "read comparisons" on comparisons for select using (status <> 'hidden');
create policy "read dimensions" on comparison_dimensions for select using (true);
create policy "read votes" on votes for select using (true);
create policy "read comments" on comments for select using (not hidden);
create policy "read profiles" on profiles for select using (true);

create policy "insert own comparison" on comparisons for insert
  with check (auth.uid() = created_by and status = 'user');
create policy "insert own dimensions" on comparison_dimensions for insert
  with check (exists (
    select 1 from comparisons c
    where c.id = comparison_id and c.created_by = auth.uid()
  ));
create policy "insert own vote" on votes for insert with check (auth.uid() = user_id);
create policy "update own vote" on votes for update using (auth.uid() = user_id);
create policy "delete own vote" on votes for delete using (auth.uid() = user_id);
create policy "insert own comment" on comments for insert with check (auth.uid() = user_id);
create policy "update own profile" on profiles for update using (auth.uid() = id);

-- report a comment without owning it (security definer RPC)
create or replace function report_comment(comment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update comments
  set reported_count = reported_count + 1,
      hidden = (reported_count + 1) >= 3  -- soft-hide threshold
  where id = comment_id;
end $$;

-- leaderboard view: net agreement
create or replace view leaderboard as
select
  c.id, c.slug, c.verdict_text, c.status, c.created_at,
  c.entity_a_id, c.entity_b_id,
  count(v.id) filter (where v.value = 'agree')::int as agrees,
  count(v.id) filter (where v.value = 'disagree')::int as disagrees,
  (count(v.id) filter (where v.value = 'agree')
   - count(v.id) filter (where v.value = 'disagree'))::int as net
from comparisons c
left join votes v on v.comparison_id = c.id
where c.status <> 'hidden'
group by c.id;
