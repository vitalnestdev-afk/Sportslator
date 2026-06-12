import { Masthead } from "@/components/Masthead";
import { LeagueTable } from "@/components/LeagueTable";
import { getLeaderboard } from "@/lib/queries";
import { MIN_VOTES } from "@/lib/types";

export const revalidate = 30;

export default async function Home() {
  const all = await getLeaderboard();
  const eligible = all.filter((r) => r.agrees + r.disagrees >= MIN_VOTES);
  // Until the corpus has votes, show everything in the table rather than an empty top flight.
  const table = eligible.length >= 8 ? eligible : all;
  const nonLeague = eligible.length >= 8
    ? all.filter((r) => r.agrees + r.disagrees < MIN_VOTES)
    : [];

  return (
    <>
      <Masthead />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 flex-1">
        {all.length === 0 ? (
          <p className="mt-16 text-center text-ink/70">
            The table is empty. Either the season hasn&apos;t started or the
            database is still warming up — try a refresh.
          </p>
        ) : (
          <>
            <LeagueTable rows={table} title="The table" zones />
            {nonLeague.length > 0 && (
              <LeagueTable
                rows={nonLeague}
                title="Non-league"
                startPosition={table.length + 1}
              />
            )}
            <p className="mt-6 font-score text-xs text-ink/50">
              ranked by net agreement &middot; takes need {MIN_VOTES}+ votes for
              the top table &middot; top of the table is promotion form, bottom
              three are going down
            </p>
          </>
        )}
      </main>
    </>
  );
}
