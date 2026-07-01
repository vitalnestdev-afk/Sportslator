"use client";

import type { Competition, Season, Sport } from "@/lib/types";

type Props = {
  sports: Sport[];
  seasons: Season[];
  competitions: Competition[];
  scopeSport: string;
  onScopeSportChange: (slug: string) => void;
  seasonId: string;
  onSeasonChange: (id: string) => void;
  competitionId: string;
  onCompetitionChange: (id: string) => void;
  contextNote: string;
  onContextNoteChange: (note: string) => void;
};

export function ContextSelectors({
  sports,
  seasons,
  competitions,
  scopeSport,
  onScopeSportChange,
  seasonId,
  onSeasonChange,
  competitionId,
  onCompetitionChange,
  contextNote,
  onContextNoteChange,
}: Props) {
  const sport = sports.find((s) => s.slug === scopeSport);
  const filteredSeasons = sport
    ? seasons.filter((s) => s.sport_id === sport.id)
    : seasons;
  const filteredComps = sport
    ? competitions.filter((c) => c.sport_id === sport.id)
    : competitions;

  return (
    <fieldset className="border-2 border-line rounded-[2px] px-4 py-3 space-y-3">
      <legend className="font-score text-xs uppercase text-ink/60 px-1">
        when &amp; where (optional)
      </legend>
      <div className="flex flex-wrap gap-3">
        <label className="block flex-1 min-w-[140px]">
          <span className="font-score text-xs text-ink/50">sport context</span>
          <select
            value={scopeSport}
            onChange={(e) => {
              onScopeSportChange(e.target.value);
              onSeasonChange("");
              onCompetitionChange("");
            }}
            className="mt-1 w-full border-2 border-line bg-whitewash px-2 py-2 rounded-[2px] font-score text-xs"
          >
            <option value="">any sport / cross-sport</option>
            {sports.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block flex-1 min-w-[140px]">
          <span className="font-score text-xs text-ink/50">season / era</span>
          <select
            value={seasonId}
            onChange={(e) => onSeasonChange(e.target.value)}
            className="mt-1 w-full border-2 border-line bg-whitewash px-2 py-2 rounded-[2px] font-score text-xs"
          >
            <option value="">not specific</option>
            {filteredSeasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block flex-1 min-w-[140px]">
          <span className="font-score text-xs text-ink/50">competition / cup</span>
          <select
            value={competitionId}
            onChange={(e) => onCompetitionChange(e.target.value)}
            className="mt-1 w-full border-2 border-line bg-whitewash px-2 py-2 rounded-[2px] font-score text-xs"
          >
            <option value="">not specific</option>
            {filteredComps.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="font-score text-xs text-ink/50">
          extra context (e.g. &quot;prime years&quot;, &quot;domestic only&quot;)
        </span>
        <input
          value={contextNote}
          onChange={(e) => onContextNoteChange(e.target.value)}
          maxLength={120}
          placeholder="Optional — narrows the take further"
          className="mt-1 w-full border-2 border-line bg-whitewash px-3 py-2 rounded-[2px] focus:outline-none focus:border-pitch"
        />
      </label>
    </fieldset>
  );
}
