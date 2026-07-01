import { sports, entities, comparisons, players } from "./seed-data.mjs";
import { writeFileSync } from "node:fs";

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
let sql = "-- generated seed\n";
for (const s of sports)
  sql += `insert into sports (name, slug) values (${q(s.name)}, ${q(s.slug)}) on conflict (slug) do nothing;\n`;
for (const [sport, name, slug, p, sec] of entities)
  sql += `insert into entities (sport_id, name, slug, type, status, primary_color, secondary_color) select id, ${q(name)}, ${q(slug)}, 'club', 'seed', ${q(p)}, ${q(sec)} from sports where slug=${q(sport)} on conflict (sport_id, slug) do nothing;\n`;
for (const [sport, name, slug, p, sec, era] of players)
  sql += `insert into entities (sport_id, name, slug, type, status, era, primary_color, secondary_color) select id, ${q(name)}, ${q(slug)}, 'player', 'seed', ${q(era)}::player_era, ${q(p)}, ${q(sec)} from sports where slug=${q(sport)} on conflict (sport_id, slug) do nothing;\n`;
for (const [a, b, verdict, dims] of comparisons) {
  const cslug = `${a}-${b}`;
  sql += `insert into comparisons (slug, entity_a_id, entity_b_id, verdict_text, status) select ${q(cslug)}, ea.id, eb.id, ${q(verdict)}, 'seed' from entities ea, entities eb where ea.slug=${q(a)} and eb.slug=${q(b)} on conflict (slug) do nothing;\n`;
  for (const [dim, text] of Object.entries(dims))
    sql += `insert into comparison_dimensions (comparison_id, dimension, rationale_text) select id, ${q(dim)}, ${q(text)} from comparisons where slug=${q(cslug)} on conflict (comparison_id, dimension) do nothing;\n`;
}
writeFileSync("seed.sql", sql);
console.log(
  "comparisons:", comparisons.length,
  "clubs:", entities.length,
  "players:", players.length,
  "bytes:", sql.length
);
