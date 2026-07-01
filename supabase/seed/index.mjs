import { sports } from "./sports.mjs";
import { fromLegacyPlayer, mergePeople } from "./helpers.mjs";
import { players } from "../players-seed.mjs";
import { nflPeople } from "./nfl.mjs";
import { nhlPeople } from "./nhl.mjs";
import { cricketPeople } from "./cricket.mjs";
import { f1People } from "./f1.mjs";
import { tennisPeople } from "./tennis.mjs";
import { golfPeople } from "./golf.mjs";
import { mlbPeople } from "./mlb.mjs";
import { coachPeople } from "./coaches.mjs";
import { rugbyPeople } from "./rugby.mjs";
import { mmaPeople } from "./mma.mjs";
import { boxingPeople } from "./boxing.mjs";

import { footballBulk } from "./bulk/football-bulk.mjs";
import { mlbBulk } from "./bulk/mlb-bulk.mjs";
import { nflBulk } from "./bulk/nfl-bulk.mjs";
import { nbaBulk } from "./bulk/nba-bulk.mjs";

export { sports };

const curated = [
  ...players.map(fromLegacyPlayer),
  ...nflPeople,
  ...nhlPeople,
  ...cricketPeople,
  ...f1People,
  ...tennisPeople,
  ...golfPeople,
  ...mlbPeople,
  ...coachPeople,
  ...rugbyPeople,
  ...mmaPeople,
  ...boxingPeople,
];

/** Curated stars + open-data bulk imports (Transfermarkt, Lahman, nflverse, nba_api). */
export const people = mergePeople(curated, [
  ...footballBulk,
  ...mlbBulk,
  ...nflBulk,
  ...nbaBulk,
]);
