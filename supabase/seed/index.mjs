import { sports } from "./sports.mjs";
import { fromLegacyPlayer } from "./helpers.mjs";
import { players } from "../players-seed.mjs";
import { nflPeople } from "./nfl.mjs";
import { nhlPeople } from "./nhl.mjs";
import { cricketPeople } from "./cricket.mjs";
import { f1People } from "./f1.mjs";
import { tennisPeople } from "./tennis.mjs";
import { golfPeople } from "./golf.mjs";
import { mlbPeople } from "./mlb.mjs";
import { coachPeople } from "./coaches.mjs";

export { sports };

/** All seeded people: players + coaches across every sport. */
export const people = [
  ...players.map(fromLegacyPlayer),
  ...nflPeople,
  ...nhlPeople,
  ...cricketPeople,
  ...f1People,
  ...tennisPeople,
  ...golfPeople,
  ...mlbPeople,
  ...coachPeople,
];
