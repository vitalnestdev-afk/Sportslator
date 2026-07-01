# Seed roster methodology

How the Sportslator people database is built, maintained, and deployed.

## Scale (current generation)

| Layer | Count | Source |
|-------|------:|--------|
| **Total people** | ~119,000 | curated + open-data bulk |
| Football players | ~48,400 | Transfermarkt datasets |
| MLB players | ~20,400 | Lahman / Baseball Databank |
| NFL players | ~25,100 | nflverse |
| NBA players | ~6,300 | nba_api static registry |
| NHL players | ~1,500 | NHL Stats API (+ curated) |
| Cricket players | ~18,200 | Cricsheet Register |
| F1 drivers | ~880 | Ergast API (jolpi.ca) |
| Curated (all sports) | ~880 | hand-picked stars + coaches |
| Clubs | 47 | original Sportslator seed |
| Sports | 12 | see below |

## Sport list (12)

Football, NBA, NFL, NHL, Cricket, F1, Tennis, Golf, MLB, Rugby, MMA, Boxing.

## Open-data import pipeline

Bulk rosters are generated from public datasets — not scraped live at runtime.

| Sport | Dataset | URL / project |
|-------|---------|---------------|
| Football | Transfermarkt datasets | `transfermarkt-datasets` on GitHub / R2 CSV |
| MLB | Lahman Baseball Databank | `cBrou/baseballdatabank` People.csv |
| NFL | nflverse player registry | `nflverse/nflverse-data` releases |
| NBA | nba_api static player list | `swar/nba_api` stats/library/data.py |
| NHL | NHL Stats API | `api.nhle.com/stats/rest` |
| F1 | Ergast API | `api.jolpi.ca/ergast/f1` |
| Cricket | Cricsheet Register | `cricsheet.org/register/people.csv` |

### Regenerate bulk imports

```bash
npm run seed:import    # fetch open data → supabase/seed/bulk/*.mjs
npm run seed:validate  # check for duplicate slugs
npm run seed:gen       # write supabase/seed.sql (~35MB)
npm run seed:sync      # upsert to Supabase (same logic as daily cron)
```

Curated stars in `supabase/seed/*.mjs` take precedence over bulk rows on slug collision.

## Disambiguation

Many players share names within a sport. We store an optional **`disambiguator`** field:

- Shown in UI as `Name (Team)` — e.g. `John Smith (Arsenal)`
- Used in slug generation when names collide: `john-smith-arsenal`
- Bulk import auto-assigns team / debut year / career span as disambiguator
- User submissions can provide a team/club identifier in the add-person form
- Dedup RPC only auto-matches by name alone when the name is **unique within that sport**

## Selection criteria (curated tier)

Curated entries (non-bulk) are chosen for global icon status, GOAT-tier legacy, current elite level, or era-defining impact. See per-sport files in `supabase/seed/`.

## Community additions

`resolve_or_create_person` RPC handles user-submitted players/coaches with the same dedup rules plus alias linking.

## Daily refresh (Vercel cron)

**Exactly one cron job** — see `vercel.json` (`0 5 * * *` daily at 05:00 UTC).

Vercel Hobby allows limited cron jobs; do **not** add extra entries without upgrading.

| Safeguard | Purpose |
|-----------|---------|
| Single `crons[]` entry | Stays within Vercel plan |
| `scripts/verify-vercel-cron.mjs` | Fails `npm run build` if more than one cron is added |
| `try_acquire_roster_sync_lock` RPC | Atomic 24h lock — one winner even if cron + manual overlap |
| Rotating sport groups | Each run syncs 2 sport sources (fits 60s timeout) |
| `CRON_SECRET` | Vercel sends `Authorization: Bearer …` automatically |

**Vercel env vars:** `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`

**Route:** `GET /api/cron/roster-sync` (optional `?force=1` to bypass lock)

Apply migration `005_roster_sync_cron.sql` before first cron run.

## Deploy

1. Run migrations through `005_roster_sync_cron.sql`
2. Apply `supabase/seed.sql` (large — ~120k INSERTs, use `psql`)
3. Set `CRON_SECRET` on Vercel — daily cron handles incremental refresh

## File structure

```
supabase/
  import/
    build-bulk.mjs     ← fetch open datasets
    roster-sync.mjs    ← daily cron upsert logic
    lib.mjs            ← CSV parse, slugify, collision handling
  seed/
    bulk/              ← generated bulk modules (git-tracked)
    index.mjs          ← merges curated + bulk
    *.mjs              ← per-sport curated rosters
  gen-seed-sql.mjs
  validate-seed.mjs
  seed.sql             ← generated (~30MB)
```
