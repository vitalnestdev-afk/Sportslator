"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Entity } from "@/lib/types";
import { entityDisplayName } from "@/lib/types";

/** Quick-fill club chips from a selected player's career memberships */
export function MembershipClubChips({
  personId,
  onPick,
  excludeIds = [],
}: {
  personId: string;
  onPick: (entity: Entity) => void;
  excludeIds?: string[];
}) {
  const [clubs, setClubs] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!personId) {
      setClubs([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const supabase = supabaseBrowser();
      const { data: mem } = await supabase
        .from("entity_memberships")
        .select("is_primary, club_id")
        .eq("person_id", personId)
        .order("is_primary", { ascending: false })
        .limit(12);

      if (!mem?.length || cancelled) {
        setLoading(false);
        return;
      }
      const ids = mem.map((m) => m.club_id).filter((id) => !excludeIds.includes(id));
      const { data: entities } = await supabase
        .from("entities")
        .select("*")
        .in("id", ids);

      if (!cancelled) {
        setClubs((entities as Entity[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [personId, excludeIds]);

  if (!personId || loading) return null;
  if (!clubs.length) return null;

  return (
    <div className="mt-2">
      <span className="font-score text-xs text-ink/50">played for — quick add:</span>
      <div className="mt-1 flex flex-wrap gap-1">
        {clubs.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c)}
            className="font-score text-xs border border-line bg-chalk px-2 py-1 rounded-[2px] hover:border-pitch hover:text-pitch"
          >
            {entityDisplayName(c)}
          </button>
        ))}
      </div>
    </div>
  );
}
