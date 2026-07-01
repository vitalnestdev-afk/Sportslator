import { people } from "./seed/index.mjs";

const dupes = [];
const seen = new Set();
for (const r of people) {
  const k = `${r[0]}/${r[2]}`;
  if (seen.has(k)) dupes.push(k);
  seen.add(k);
}

const bySport = {};
const byType = {};
for (const [sport, , , , , type] of people) {
  bySport[sport] = (bySport[sport] ?? 0) + 1;
  byType[type] = (byType[type] ?? 0) + 1;
}

console.log("people:", people.length);
console.log("by sport:", bySport);
console.log("by type:", byType);

if (dupes.length) {
  console.error("DUPLICATE SLUGS:", dupes);
  process.exit(1);
}
console.log("OK — no duplicate slugs");
