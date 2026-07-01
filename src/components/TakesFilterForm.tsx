import type { Competition, Entity, Season, Sport } from "@/lib/types";

type Props = {
  sports: Sport[];
  seasons: Season[];
  competitions: Competition[];
  clubs: Entity[];
  values: {
    sport?: string;
    season?: string;
    competition?: string;
    entity?: string;
    q?: string;
  };
};

export function TakesFilterForm({
  sports,
  seasons,
  competitions,
  clubs,
  values,
}: Props) {
  const sport = sports.find((s) => s.slug === values.sport);
  const filteredSeasons = sport
    ? seasons.filter((s) => s.sport_id === sport.id)
    : seasons;
  const filteredComps = sport
    ? competitions.filter((c) => c.sport_id === sport.id)
    : competitions;

  return (
    <form action="/takes" method="get" className="mt-6 space-y-3">
      <div className="flex flex-wrap gap-2">
        <select
          name="sport"
          defaultValue={values.sport ?? ""}
          className="border-2 border-line bg-whitewash px-2 py-2 rounded-[2px] font-score text-xs"
        >
          <option value="">any sport</option>
          {sports.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="season"
          defaultValue={values.season ?? ""}
          className="border-2 border-line bg-whitewash px-2 py-2 rounded-[2px] font-score text-xs"
        >
          <option value="">any season</option>
          {filteredSeasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          name="competition"
          defaultValue={values.competition ?? ""}
          className="border-2 border-line bg-whitewash px-2 py-2 rounded-[2px] font-score text-xs"
        >
          <option value="">any competition</option>
          {filteredComps.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="entity"
          defaultValue={values.entity ?? ""}
          className="border-2 border-line bg-whitewash px-2 py-2 rounded-[2px] font-score text-xs max-w-[200px]"
        >
          <option value="">any entity</option>
          {clubs.slice(0, 150).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} (club)
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={values.q ?? ""}
          placeholder="Search verdict text…"
          className="flex-1 min-w-[200px] border-2 border-ink bg-whitewash px-3 py-2 rounded-[2px]"
        />
        <button
          type="submit"
          className="font-display text-sm bg-ink text-whitewash px-4 py-2 rounded-[2px] hover:bg-pitch"
        >
          Filter
        </button>
        <a
          href="/takes"
          className="font-score text-xs self-center underline hover:text-pitch"
        >
          clear
        </a>
      </div>
    </form>
  );
}
