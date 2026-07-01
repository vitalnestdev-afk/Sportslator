-- Migration v7: player/coach ↔ club memberships + external IDs for dataset linking

alter table entities add column if not exists external_ref text;

create unique index if not exists entities_sport_external_ref_idx
  on entities (sport_id, external_ref)
  where external_ref is not null;

create table entity_memberships (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references entities(id) on delete cascade,
  club_id uuid not null references entities(id) on delete cascade,
  sport_id uuid not null references sports(id) on delete cascade,
  season_start int,
  season_end int,
  role text,
  is_primary boolean not null default false,
  source text not null default 'import',
  unique (person_id, club_id, season_start)
);

create index entity_memberships_person_idx on entity_memberships (person_id);
create index entity_memberships_club_idx on entity_memberships (club_id);
create index entity_memberships_sport_club_idx on entity_memberships (sport_id, club_id);
create index entity_memberships_primary_idx on entity_memberships (person_id) where is_primary;

alter table entity_memberships enable row level security;

create policy "read entity memberships" on entity_memberships for select using (true);

comment on table entity_memberships is
  'Structured career links: which clubs/teams a player or coach was affiliated with.';
comment on column entities.external_ref is
  'External dataset ID (e.g. Transfermarkt player_id / club_id, nflverse gsis_id).';
