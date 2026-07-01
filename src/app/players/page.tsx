import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { countPeople, getPeople, getSports } from "@/lib/queries";
import { entityDisplayName } from "@/lib/types";
import type { EntityType } from "@/lib/types";

const PAGE_SIZE = 120;

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; type?: string; q?: string; page?: string }>;
}) {
  const { sport: sportFilter, type: typeFilter, q, page: pageStr } =
    await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const entityType =
    typeFilter === "coach" || typeFilter === "player"
      ? (typeFilter as EntityType)
      : undefined;

  const offset = (page - 1) * PAGE_SIZE;

  const [people, sports, totalPlayers, totalCoaches, totalAll] =
    await Promise.all([
      getPeople({
        sportSlug: sportFilter,
        type: entityType,
        q,
        limit: PAGE_SIZE,
        offset,
      }),
      getSports(),
      countPeople({ sportSlug: sportFilter, type: "player" }),
      countPeople({ sportSlug: sportFilter, type: "coach" }),
      countPeople({ sportSlug: sportFilter }),
    ]);

  const totalShown = entityType === "coach" ? totalCoaches : entityType === "player" ? totalPlayers : totalAll;
  const totalPages = Math.max(1, Math.ceil(totalShown / PAGE_SIZE));

  return (
    <>
      <Masthead />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 flex-1">
        <h1 className="font-display text-4xl mt-10">Stars &amp; coaches</h1>
        <p className="mt-2 text-ink/70 max-w-2xl">
          {totalAll.toLocaleString()} people across {sports.length} sports —
          imported from open datasets plus community suggestions. Search to find
          anyone, obscure or iconic.
        </p>

        <form className="mt-6 flex flex-wrap gap-2" action="/players" method="get">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name or team…"
            className="flex-1 min-w-[200px] border-2 border-ink bg-whitewash px-3 py-2 rounded-[2px]"
          />
          {sportFilter && (
            <input type="hidden" name="sport" value={sportFilter} />
          )}
          {entityType && <input type="hidden" name="type" value={entityType} />}
          <button
            type="submit"
            className="font-display text-sm bg-ink text-whitewash px-4 py-2 rounded-[2px] hover:bg-pitch"
          >
            Search
          </button>
        </form>

        <nav className="mt-4 flex flex-wrap gap-2 font-score text-xs">
          <FilterLink href="/players" active={!sportFilter && !entityType && !q} label="all sports" />
          {sports.map((s) => (
            <FilterLink
              key={s.id}
              href={`/players?sport=${s.slug}${entityType ? `&type=${entityType}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              active={sportFilter === s.slug}
              label={s.name}
            />
          ))}
        </nav>

        <nav className="mt-3 flex flex-wrap gap-2 font-score text-xs">
          <FilterLink
            href={`/players${sportFilter ? `?sport=${sportFilter}` : ""}${q ? `${sportFilter ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`}
            active={!entityType}
            label={`all (${totalAll.toLocaleString()})`}
          />
          <FilterLink
            href={`/players?type=player${sportFilter ? `&sport=${sportFilter}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            active={entityType === "player"}
            label={`players (${totalPlayers.toLocaleString()})`}
          />
          <FilterLink
            href={`/players?type=coach${sportFilter ? `&sport=${sportFilter}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            active={entityType === "coach"}
            label={`coaches (${totalCoaches.toLocaleString()})`}
          />
        </nav>

        <p className="mt-4 font-score text-xs text-ink/50">
          page {page} of {totalPages} · showing {people.length} of{" "}
          {totalShown.toLocaleString()}
        </p>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 border-2 border-line bg-whitewash px-3 py-2 rounded-[2px]"
            >
              <span
                className="h-8 w-8 shrink-0 rounded-full border border-ink/20"
                style={{
                  background: `linear-gradient(135deg, ${p.primary_color} 50%, ${p.secondary_color} 50%)`,
                }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="font-semibold truncate">{entityDisplayName(p)}</p>
                <p className="font-score text-xs text-ink/50">
                  {p.sport.name} · {p.type}
                  {p.era ? ` · ${p.era}` : ""}
                  {p.status === "user" ? " · suggested" : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <nav className="mt-6 flex gap-3 font-score text-xs">
            {page > 1 && (
              <PageLink
                page={page - 1}
                sport={sportFilter}
                type={entityType}
                q={q}
                label="← prev"
              />
            )}
            {page < totalPages && (
              <PageLink
                page={page + 1}
                sport={sportFilter}
                type={entityType}
                q={q}
                label="next →"
              />
            )}
          </nav>
        )}
      </main>
    </>
  );
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`px-2 py-1 border-2 rounded-[2px] ${active ? "border-pitch bg-pitch/10" : "border-line hover:border-pitch"}`}
    >
      {label}
    </Link>
  );
}

function PageLink({
  page,
  sport,
  type,
  q,
  label,
}: {
  page: number;
  sport?: string;
  type?: string;
  q?: string;
  label: string;
}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (sport) params.set("sport", sport);
  if (type) params.set("type", type);
  if (q) params.set("q", q);
  return (
    <Link
      href={`/players?${params}`}
      className="underline hover:text-pitch"
    >
      {label}
    </Link>
  );
}
