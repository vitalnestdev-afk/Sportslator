import { NextResponse } from "next/server";

/** Vercel Hobby: one cron slot — keep a single daily schedule in vercel.json. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Daily roster refresh. Gated by:
 * 1. CRON_SECRET (Vercel sends Authorization: Bearer automatically)
 * 2. roster_sync_state 24h lock in Postgres (see roster-sync.mjs)
 *
 * Manual trigger: GET /api/cron/roster-sync with same Bearer token.
 * Force bypass lock: ?force=1 (still requires CRON_SECRET)
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";

  try {
    const { runRosterSync } = await import(
      "../../../../../supabase/import/roster-sync.mjs"
    );
    const result = await runRosterSync({ force });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
