import { fgOn, needsEdge } from "@/lib/colors";
import type { Entity } from "@/lib/types";
import { entityDisplayName } from "@/lib/types";

/**
 * The signature: half-and-half club-colour split with a diagonal seam,
 * echoing the matchday half-and-half scarf. Used on the comparison hero
 * and the OG card. Nowhere else.
 */
export function SplitHero({
  a,
  b,
  animate = false,
}: {
  a: Entity;
  b: Entity;
  animate?: boolean;
}) {
  const fgA = fgOn(a.primary_color);
  const fgB = fgOn(b.primary_color);
  return (
    <div
      className="relative overflow-hidden rounded-[2px]"
      style={{ background: b.primary_color }}
    >
      {/* left panel with diagonal seam */}
      <div
        className={`absolute inset-0 ${animate ? "seam-in" : ""}`}
        style={{
          background: a.primary_color,
          clipPath: "polygon(0 0, 56% 0, 44% 100%, 0 100%)",
        }}
      />
      {needsEdge(a.primary_color) && (
        <div
          className="absolute inset-0 pointer-events-none rounded-[2px]"
          style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
        />
      )}
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 py-10 sm:px-10 sm:py-14">
        <div style={{ color: fgA }}>
          <div
            className="h-1 w-10 mb-3"
            style={{ background: a.secondary_color }}
          />
          <h1 className="font-display text-3xl sm:text-5xl leading-[0.95] break-words">
            {entityDisplayName(a)}
          </h1>
        </div>
        <div
          className="font-display text-4xl sm:text-6xl px-2 sm:px-4 mix-blend-difference text-white"
          aria-label="is approximately"
        >
          &asymp;
        </div>
        <div className="text-right" style={{ color: fgB }}>
          <div
            className="h-1 w-10 mb-3 ml-auto"
            style={{ background: b.secondary_color }}
          />
          <h1 className="font-display text-3xl sm:text-5xl leading-[0.95] break-words">
            {entityDisplayName(b)}
          </h1>
        </div>
      </div>
    </div>
  );
}
