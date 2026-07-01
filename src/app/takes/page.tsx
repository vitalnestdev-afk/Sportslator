import Link from "next/link";
import {
  getCompetitions,
  getSeasons,
  getSports,
  getTakes,
  getClubs,
} from "@/lib/queries";
import { Masthead } from "@/components/Masthead";
import { LeagueTable } from "@/components/LeagueTable";
import { TakesFilterForm } from "@/components/TakesFilterForm";

const PAGE_SIZE = 40;

export default async function TakesPage({
  searchParams,
}: {
  searchParams: Promise<{
    sport?: string;
    season?: string;
    competition?: string;
    entity?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [sports, seasons, competitions, { rows, total }, clubs] =
    await Promise.all([
      getSports(),
      getSeasons(),
      getCompetitions(),
      getTakes({
        sportSlug: sp.sport,
        seasonId: sp.season,
        competitionId: sp.competition,
        entityId: sp.entity,
        q: sp.q,
        limit: PAGE_SIZE,
        offset,
      }),
      getClubs({ sportSlug: sp.sport, limit: 200 }),
    ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Masthead />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 flex-1">
        <h1 className="font-display text-4xl mt-10">All takes</h1>
        <p className="mt-2 text-ink/70 max-w-2xl">
          Browse equivalence takes by sport, season, competition, or entity.
          Filter the main table — every take is an X ≈ Y ≈ Z sentence the crowd
          ranks.
        </p>

        <TakesFilterForm
          sports={sports}
          seasons={seasons}
          competitions={competitions}
          clubs={clubs}
          values={sp}
        />

        {rows.length === 0 ? (
          <p className="mt-10 text-ink/60">
            No takes match those filters.{" "}
            <Link href="/propose" className="underline hover:text-pitch">
              Write one
            </Link>
            .
          </p>
        ) : (
          <>
            <LeagueTable
              rows={rows}
              title={`${total.toLocaleString()} takes`}
              startPosition={offset + 1}
            />
            {totalPages > 1 && (
              <nav className="mt-6 flex gap-3 font-score text-xs">
                {page > 1 && (
                  <PageLink sp={sp} page={page - 1} label="← newer" />
                )}
                <span className="text-ink/50">
                  page {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <PageLink sp={sp} page={page + 1} label="older →" />
                )}
              </nav>
            )}
          </>
        )}
      </main>
    </>
  );
}

function PageLink({
  sp,
  page,
  label,
}: {
  sp: Record<string, string | undefined>;
  page: number;
  label: string;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "page") params.set(k, v);
  }
  params.set("page", String(page));
  return (
    <Link href={`/takes?${params}`} className="underline hover:text-pitch">
      {label}
    </Link>
  );
}
