"use client";

import { EntityPicker } from "./EntityPicker";
import { MembershipClubChips } from "./MembershipClubChips";
import type { Entity, Sport } from "@/lib/types";
import {
  MAX_EQUIVALENCE_SLOTS,
  MIN_EQUIVALENCE_SLOTS,
} from "@/lib/equivalence";

type Props = {
  slots: string[];
  onChange: (slots: string[]) => void;
  clubs: Entity[];
  sports: Sport[];
  onEntityAdded: (entity: Entity) => void;
  entityCache: Map<string, Entity>;
};

export function EquivalenceBuilder({
  slots,
  onChange,
  clubs,
  sports,
  onEntityAdded,
  entityCache,
}: Props) {
  function setSlot(index: number, id: string) {
    const next = [...slots];
    next[index] = id;
    onChange(next);
  }

  function addSlot() {
    if (slots.length >= MAX_EQUIVALENCE_SLOTS) return;
    onChange([...slots, ""]);
  }

  function removeSlot(index: number) {
    if (slots.length <= MIN_EQUIVALENCE_SLOTS) return;
    onChange(slots.filter((_, i) => i !== index));
  }

  const usedIds = new Set(slots.filter(Boolean));

  const hintPersonId = (() => {
    for (const id of slots) {
      if (!id) continue;
      const e = entityCache.get(id);
      if (e && (e.type === "player" || e.type === "coach")) return id;
    }
    return "";
  })();

  function pickClubForSlot(index: number, entity: Entity) {
    onEntityAdded(entity);
    setSlot(index, entity.id);
  }

  return (
    <div className="space-y-3">
      <p className="font-score text-xs uppercase text-ink/60">
        build your equivalence
      </p>
      <div className="flex flex-wrap items-start gap-x-2 gap-y-4">
        {slots.map((slotId, index) => (
          <div key={index} className="flex items-start gap-2">
            {index > 0 && (
              <span className="font-display text-2xl pt-8 shrink-0">&asymp;</span>
            )}
            <div className="min-w-[220px] flex-1">
              <EntityPicker
                value={slotId}
                onChange={(id) => setSlot(index, id)}
                clubs={clubs}
                sports={sports}
                label={index === 0 ? "this…" : index === slots.length - 1 ? "…equals this" : "…equals…"}
                excludeIds={[...usedIds].filter((id) => id !== slotId)}
                onEntityAdded={onEntityAdded}
              />
              {slots.length > MIN_EQUIVALENCE_SLOTS && (
                <button
                  type="button"
                  onClick={() => removeSlot(index)}
                  className="mt-1 font-score text-xs text-ink/50 underline hover:text-cardred"
                >
                  remove slot
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {hintPersonId && (
        <MembershipClubChips
          personId={hintPersonId}
          excludeIds={[...usedIds]}
          onPick={(club) => {
            const emptyIdx = slots.findIndex((s) => !s);
            if (emptyIdx >= 0) pickClubForSlot(emptyIdx, club);
          }}
        />
      )}
      {slots.length < MAX_EQUIVALENCE_SLOTS && (
        <button
          type="button"
          onClick={addSlot}
          className="font-score text-xs underline hover:text-pitch"
        >
          + add another equivalent ({slots.length}/{MAX_EQUIVALENCE_SLOTS})
        </button>
      )}
    </div>
  );
}
