import Link from "next/link";
import { fgOn } from "@/lib/colors";
import { membersLabel } from "@/lib/queries";
import type { Entity, LeaderboardRow } from "@/lib/types";

function Swatch({ members }: { members: Entity[] }) {
  const a = members[0];
  const b = members[1] ?? members[0];
  return (
    <span
      className="inline-block h-4 w-7 align-middle rounded-[2px] overflow-hidden relative"
      aria-hidden
    >
      <span
        className="absolute inset-0"
        style={{ background: b.primary_color }}
      />
      <span
        className="absolute inset-0"
        style={{
          background: a.primary_color,
          clipPath: "polygon(0 0, 60% 0, 40% 100%, 0 100%)",
        }}
      />
    </span>
  );
}

export function LeagueTable({
  rows,
  title,
  startPosition = 1,
  zones = false,
}: {
  rows: LeaderboardRow[];
  title: string;
  startPosition?: number;
  zones?: boolean;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-1">
        <h2 className="font-display text-xl">{title}</h2>
        <span className="font-score text-xs text-ink/60">
          {rows.length} takes
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="font-score text-xs text-ink/60 text-left">
            <th className="py-2 pr-2 w-8">#</th>
            <th className="py-2 pr-2 w-9"></th>
            <th className="py-2 pr-2">equivalence</th>
            <th className="py-2 pr-2 text-right w-12">agr</th>
            <th className="py-2 pr-2 text-right w-12">dis</th>
            <th className="py-2 text-right w-14">net</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const pos = startPosition + i;
            const members = r.members ?? [r.entity_a, r.entity_b];
            const zoneClass = !zones
              ? ""
              : i < 4
                ? "border-l-4 border-l-pitch"
                : i >= rows.length - 3 && rows.length > 8
                  ? "border-l-4 border-l-cardred"
                  : "border-l-4 border-l-transparent";
            return (
              <tr
                key={r.id}
                className={`${zoneClass} ${i % 2 ? "bg-whitewash" : ""} border-b border-line hover:bg-ink/5`}
              >
                <td className="py-2 pr-2 font-score">{pos}</td>
                <td className="py-2 pr-2">
                  <Swatch members={members} />
                </td>
                <td className="py-2 pr-2">
                  <Link
                    href={`/c/${r.slug}`}
                    className="font-display text-base hover:text-pitch"
                  >
                    {membersLabel(members)}
                  </Link>
                  <span className="hidden sm:inline text-ink/60">
                    {" "}
                    — {r.verdict_text}
                  </span>
                </td>
                <td className="py-2 pr-2 text-right font-score text-pitch">
                  {r.agrees}
                </td>
                <td className="py-2 pr-2 text-right font-score text-cardred">
                  {r.disagrees}
                </td>
                <td
                  className={`py-2 text-right font-score font-bold ${r.net > 0 ? "text-pitch" : r.net < 0 ? "text-cardred" : ""}`}
                >
                  {r.net > 0 ? `+${r.net}` : r.net}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
