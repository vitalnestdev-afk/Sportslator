import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { getPlayers, getSports } from "@/lib/queries";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport: sportFilter } = await searchParams;
  const [players, sports] = await Promise.all([
    getPlayers(sportFilter),
    getSports(),
  ]);

  const active = players.filter((p) => p.era === "active");
  const historic = players.filter((p) => p.era === "historic");
  const community = players.filter((p) => p.status === "user");
  const unclassified = players.filter((p) => !p.era);

  return (
    <>
      <Masthead />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 flex-1">
        <h1 className="font-display text-4xl mt-10">Players</h1>
        <p className="mt-2 text-ink/70">
          Every football and NBA player in the database — seeded legends, active
          stars, and community suggestions. Compare anyone when you{" "}
          <Link href="/propose" className="underline hover:text-pitch">
            write a take
          </Link>
          .
        </p>

        <nav className="mt-6 flex flex-wrap gap-2 font-score text-xs">
          <Link
            href="/players"
            className={`px-2 py-1 border-2 rounded-[2px] ${!sportFilter ? "border-pitch bg-pitch/10" : "border-line hover:border-pitch"}`}
          >
            all sports
          </Link>
          {sports.map((s) => (
            <Link
              key={s.id}
              href={`/players?sport=${s.slug}`}
              className={`px-2 py-1 border-2 rounded-[2px] ${sportFilter === s.slug ? "border-pitch bg-pitch/10" : "border-line hover:border-pitch"}`}
            >
              {s.name}
            </Link>
          ))}
        </nav>

        <p className="mt-4 font-score text-xs text-ink/50">
          {players.length} players
          {community.length > 0 && ` · ${community.length} community-added`}
        </p>

        {active.length > 0 && (
          <PlayerSection title="Active" players={active} />
        )}
        {historic.length > 0 && (
          <PlayerSection title="Historic" players={historic} />
        )}
        {unclassified.length > 0 && (
          <PlayerSection title="Community" players={unclassified} />
        )}
      </main>
    </>
  );
}

function PlayerSection({
  title,
  players,
}: {
  title: string;
  players: Awaited<ReturnType<typeof getPlayers>>;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl">{title}</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {players.map((p) => (
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
                {p.sport.name}
                {p.status === "user" && " · suggested"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
