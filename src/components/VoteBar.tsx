/** Possession-stat style agree/disagree bar. */
export function VoteBar({
  agrees,
  disagrees,
}: {
  agrees: number;
  disagrees: number;
}) {
  const total = agrees + disagrees;
  const pct = total === 0 ? 50 : Math.round((agrees / total) * 100);
  return (
    <div>
      <div className="flex justify-between font-score text-xs mb-1">
        <span className="text-pitch font-bold">AGREE {agrees}</span>
        <span>
          {total === 0 ? "no votes yet — someone has to start" : `${pct}%–${100 - pct}%`}
        </span>
        <span className="text-cardred font-bold">{disagrees} DISAGREE</span>
      </div>
      <div className="h-3 w-full bg-line rounded-[2px] overflow-hidden flex">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "var(--pitch)" }}
        />
        <div
          className="h-full flex-1"
          style={{ background: total === 0 ? "var(--line)" : "var(--card-red)" }}
        />
      </div>
    </div>
  );
}
