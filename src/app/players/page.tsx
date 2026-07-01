import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { getPeople, getSports } from "@/lib/queries";
import type { EntityType } from "@/lib/types";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; type?: string }>;
}) {
  const { sport: sportFilter, type: typeFilter } = await searchParams;
  const entityType =
    typeFilter === "coach" || typeFilter === "player"
      ? (typeFilter as EntityType)
      : undefined;

  const [people, sports] = await Promise.all([
    getPeople({ sportSlug: sportFilter, type: entityType }),
    getSports(),
  ]);

  const players = people.filter((p) => p.type === "player");
  const coaches = people.filter((p) => p.type === "coach");
  const community = people.filter((p) => p.status === "user");

  const active = people.filter((p) => p.era === "active");
  const historic = people.filter((p) => p.era === "historic");
  const unclassified = people.filter((p) => !p.era);

  const showPlayers = !entityType || entityType === "player";
  const showCoaches = !entityType || entityType === "coach";

  return (
    <>
      <Masthead />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 flex-1">
        <h1 className="font-display text-4xl mt-10">Stars &amp; coaches</h1>
        <p className="mt-2 text-ink/70 max-w-2xl">
          {people.length} seeded and community-suggested people across{" "}
          {sports.length} sports — players, drivers, coaches, and managers.
          Compare anyone when you{" "}
          <Link href="/propose" className="underline hover:text-pitch">
            write a take
          </Link>
          .
        </p>

        <nav className="mt-6 flex flex-wrap gap-2 font-score text-xs">
          <FilterLink
            href="/players"
            active={!sportFilter && !entityType}
            label="all"
          />
          {sports.map((s) => (
            <FilterLink
              key={s.id}
              href={`/players?sport=${s.slug}${entityType ? `&type=${entityType}` : ""}`}
              active={sportFilter === s.slug}
              label={s.name}
            />
          ))}
        </nav>

        <nav className="mt-3 flex flex-wrap gap-2 font-score text-xs">
          <FilterLink
            href={`/players${sportFilter ? `?sport=${sportFilter}` : ""}`}
            active={!entityType}
            label="players + coaches"
          />
          <FilterLink
            href={`/players?type=player${sportFilter ? `&sport=${sportFilter}` : ""}`}
            active={entityType === "player"}
            label={`players (${players.length})`}
          />
          <FilterLink
            href={`/players?type=coach${sportFilter ? `&sport=${sportFilter}` : ""}`}
            active={entityType === "coach"}
            label={`coaches (${coaches.length})`}
          />
        </nav>

        <p className="mt-4 font-score text-xs text-ink/50">
          showing {people.length}
          {community.length > 0 && ` · ${community.length} community-added`}
        </p>

        {showPlayers && active.filter((p) => p.type === "player").length > 0 && (
          <RosterSection
            title="Active players"
            items={active.filter((p) => p.type === "player")}
          />
        )}
        {showPlayers &&
          historic.filter((p) => p.type === "player").length > 0 && (
            <RosterSection
              title="Historic players"
              items={historic.filter((p) => p.type === "player")}
            />
          )}
        {showCoaches && coaches.filter((p) => p.era === "active").length > 0 && (
          <RosterSection
            title="Active coaches"
            items={coaches.filter((p) => p.era === "active")}
          />
        )}
        {showCoaches &&
          coaches.filter((p) => p.era === "historic").length > 0 && (
            <RosterSection
              title="Historic coaches"
              items={coaches.filter((p) => p.era === "historic")}
            />
          )}
        {unclassified.length > 0 && (
          <RosterSection title="Community suggestions" items={unclassified} />
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

function RosterSection({
  title,
  items,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getPeople>>;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl">
        {title}{" "}
        <span className="font-score text-sm text-ink/40">({items.length})</span>
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
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
              <p className="font-semibold truncate">{p.name}</p>
              <p className="font-score text-xs text-ink/50">
                {p.sport.name} · {p.type}
                {p.status === "user" && " · suggested"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
