/**
 * Fail CI/build if vercel.json exceeds Vercel Hobby cron limits.
 * Hobby: 1 cron job per project (daily trigger only).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const MAX_CRONS = 1;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vercelPath = join(root, "vercel.json");

const vercel = JSON.parse(readFileSync(vercelPath, "utf8"));
const crons = vercel.crons ?? [];

if (crons.length > MAX_CRONS) {
  console.error(
    `vercel.json defines ${crons.length} cron job(s); Vercel Hobby allows ${MAX_CRONS}.`,
  );
  console.error("Remove extra crons[] entries or upgrade the Vercel plan.");
  process.exit(1);
}

if (crons.length === 0) {
  console.warn("verify-vercel-cron: no crons[] in vercel.json (roster sync disabled).");
} else {
  const paths = crons.map((c) => c.path).join(", ");
  console.log(`verify-vercel-cron: ${crons.length}/${MAX_CRONS} cron slot(s) — ${paths}`);
}
