import { fgOn } from "@/lib/colors";
import type { Entity } from "@/lib/types";
import { entityDisplayName } from "@/lib/types";
import { SplitHero } from "./SplitHero";

/**
 * N-way equivalence hero. Two sides use the classic diagonal split;
 * three or more use a horizontal colour strip.
 */
export function EquivalenceHero({
  members,
  animate = false,
}: {
  members: Entity[];
  animate?: boolean;
}) {
  if (members.length === 2) {
    return <SplitHero a={members[0]} b={members[1]} animate={animate} />;
  }

  return (
    <div className="relative overflow-hidden rounded-[2px] border-2 border-line">
      <div
        className="grid gap-0"
        style={{
          gridTemplateColumns: `repeat(${members.length}, minmax(0, 1fr))`,
        }}
      >
        {members.map((m, i) => {
          const fg = fgOn(m.primary_color);
          return (
            <div
              key={m.id}
              className={`relative px-3 py-8 sm:px-5 sm:py-10 ${animate ? "seam-in" : ""}`}
              style={{
                background: m.primary_color,
                animationDelay: `${i * 80}ms`,
              }}
            >
              {i > 0 && (
                <span
                  className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-2xl sm:text-4xl text-whitewash mix-blend-difference z-10"
                  aria-hidden
                >
                  &asymp;
                </span>
              )}
              <div style={{ color: fg }}>
                <div
                  className="h-1 w-8 mb-2"
                  style={{ background: m.secondary_color }}
                />
                <h1 className="font-display text-xl sm:text-3xl leading-tight break-words">
                  {entityDisplayName(m)}
                </h1>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
