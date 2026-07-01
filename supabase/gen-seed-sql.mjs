import { sports, people } from "./seed/index.mjs";
import { clubs } from "./seed/clubs.mjs";
import { competitions } from "./seed/competitions.mjs";
import { seasons } from "./seed/seasons.mjs";
import { comparisons } from "./seed-data.mjs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const qn = (v) => (v == null || v === "" ? "null" : q(v));
const qi = (v) => (v == null ? "null" : String(v));

let sql = "-- generated seed\n";

for (const s of sports)
  sql += `insert into sports (name, slug) values (${q(s.name)}, ${q(s.slug)}) on conflict (slug) do nothing;\n`;

for (const [sport, name, slug, p, sec] of clubs)
  sql += `insert into entities (sport_id, name, slug, type, status, primary_color, secondary_color) select id, ${q(name)}, ${q(slug)}, 'club', 'seed', ${q(p)}, ${q(sec)} from sports where slug=${q(sport)} on conflict (sport_id, slug) do nothing;\n`;

for (const row of people) {
  const [sport, name, slug, p, sec, type, era, disambiguator] = row;
  const eraSql = era ? `${q(era)}::player_era` : "null";
  sql += `insert into entities (sport_id, name, slug, type, status, era, disambiguator, primary_color, secondary_color) select id, ${q(name)}, ${q(slug)}, ${q(type)}, 'seed', ${eraSql}, ${qn(disambiguator)}, ${q(p)}, ${q(sec)} from sports where slug=${q(sport)} on conflict (sport_id, slug) do nothing;\n`;
}

for (const [sport, label, slug, yearStart, yearEnd] of seasons)
  sql += `insert into seasons (sport_id, label, slug, year_start, year_end) select id, ${q(label)}, ${q(slug)}, ${qi(yearStart)}, ${qi(yearEnd)} from sports where slug=${q(sport)} on conflict (sport_id, slug) do nothing;\n`;

for (const [sport, name, slug, scope] of competitions)
  sql += `insert into competitions (sport_id, name, slug, scope) select id, ${q(name)}, ${q(slug)}, ${q(scope)} from sports where slug=${q(sport)} on conflict (sport_id, slug) do nothing;\n`;

for (const [a, b, verdict, dims] of comparisons) {
  const cslug = `${a}-${b}`;
  sql += `insert into comparisons (slug, entity_a_id, entity_b_id, verdict_text, status) select ${q(cslug)}, ea.id, eb.id, ${q(verdict)}, 'seed' from entities ea, entities eb where ea.slug=${q(a)} and eb.slug=${q(b)} on conflict (slug) do nothing;\n`;
  sql += `insert into comparison_members (comparison_id, entity_id, position) select c.id, ea.id, 0 from comparisons c, entities ea where c.slug=${q(cslug)} and ea.slug=${q(a)} on conflict (comparison_id, entity_id) do nothing;\n`;
  sql += `insert into comparison_members (comparison_id, entity_id, position) select c.id, eb.id, 1 from comparisons c, entities eb where c.slug=${q(cslug)} and eb.slug=${q(b)} on conflict (comparison_id, entity_id) do nothing;\n`;
  for (const [dim, text] of Object.entries(dims))
    sql += `insert into comparison_dimensions (comparison_id, dimension, rationale_text) select id, ${q(dim)}, ${q(text)} from comparisons where slug=${q(cslug)} on conflict (comparison_id, dimension) do nothing;\n`;
}

writeFileSync(join(root, "seed.sql"), sql);

const bySport = {};
const byType = {};
for (const row of people) {
  const [sport, , , , , type] = row;
  bySport[sport] = (bySport[sport] ?? 0) + 1;
  byType[type] = (byType[type] ?? 0) + 1;
}

console.log(
  "sports:", sports.length,
  "clubs:", clubs.length,
  "seasons:", seasons.length,
  "competitions:", competitions.length,
  "people:", people.length,
  "by type:", byType,
  "comparisons:", comparisons.length,
  "bytes:", sql.length
);
