import { person, sportDefault as c } from "./helpers.mjs";

const [p, s] = c("nfl");

export const nflPeople = [
  // ── Quarterbacks — active ──
  person("nfl", "Patrick Mahomes", "patrick-mahomes", "#E31837", "#FFB612", "player", "active"),
  person("nfl", "Josh Allen", "josh-allen", "#00338D", "#C60C30", "player", "active"),
  person("nfl", "Lamar Jackson", "lamar-jackson", "#241773", "#9E7C0C", "player", "active"),
  person("nfl", "Joe Burrow", "joe-burrow", "#FB4F14", "#000000", "player", "active"),
  person("nfl", "Jalen Hurts", "jalen-hurts", "#004C54", "#A5ACAF", "player", "active"),
  person("nfl", "Justin Herbert", "justin-herbert", "#0080C6", "#FFC20E", "player", "active"),
  person("nfl", "Dak Prescott", "dak-prescott", "#003594", "#869397", "player", "active"),
  person("nfl", "Tua Tagovailoa", "tua-tagovailoa", "#008E97", "#FC4C02", "player", "active"),
  person("nfl", "Trevor Lawrence", "trevor-lawrence", "#006778", "#D7A22A", "player", "active"),
  person("nfl", "C.J. Stroud", "cj-stroud", "#03202F", "#A71930", "player", "active"),
  person("nfl", "Brock Purdy", "brock-purdy", "#AA0000", "#B3995D", "player", "active"),
  // ── Quarterbacks — historic ──
  person("nfl", "Tom Brady", "tom-brady", "#002244", "#C60C30", "player", "historic"),
  person("nfl", "Joe Montana", "joe-montana", "#AA0000", "#B3995D", "player", "historic"),
  person("nfl", "Peyton Manning", "peyton-manning", "#002C5F", "#A2AAAD", "player", "historic"),
  person("nfl", "John Elway", "john-elway", "#FB4F14", "#002244", "player", "historic"),
  person("nfl", "Dan Marino", "dan-marino", "#008E97", "#FC4C02", "player", "historic"),
  person("nfl", "Brett Favre", "brett-favre", "#203731", "#FFB612", "player", "historic"),
  person("nfl", "Steve Young", "steve-young", "#AA0000", "#B3995D", "player", "historic"),
  person("nfl", "Terry Bradshaw", "terry-bradshaw", "#FFB612", "#101820", "player", "historic"),
  person("nfl", "Johnny Unitas", "johnny-unitas", "#002C5F", "#A2AAAD", "player", "historic"),
  // ── Running backs — active ──
  person("nfl", "Christian McCaffrey", "christian-mccaffrey", "#AA0000", "#B3995D", "player", "active"),
  person("nfl", "Derrick Henry", "derrick-henry", "#241773", "#9E7C0C", "player", "active"),
  person("nfl", "Saquon Barkley", "saquon-barkley", "#004C54", "#A5ACAF", "player", "active"),
  person("nfl", "Bijan Robinson", "bijan-robinson", "#A71930", "#000000", "player", "active"),
  person("nfl", "Jonathan Taylor", "jonathan-taylor", "#002C5F", "#A2AAAD", "player", "active"),
  person("nfl", "Josh Jacobs", "josh-jacobs", "#203731", "#FFB612", "player", "active"),
  person("nfl", "Alvin Kamara", "alvin-kamara", "#D3BC8D", "#101820", "player", "active"),

  // ── Running backs — historic ──
  person("nfl", "Barry Sanders", "barry-sanders", "#0076B6", "#B0B7BC", "player", "historic"),
  person("nfl", "Walter Payton", "walter-payton", "#0B162A", "#C83803", "player", "historic"),
  person("nfl", "Emmitt Smith", "emmitt-smith", "#003594", "#869397", "player", "historic"),
  person("nfl", "Jim Brown", "jim-brown", "#311D00", "#FF3C00", "player", "historic"),
  person("nfl", "LaDainian Tomlinson", "ladainian-tomlinson", "#0080C6", "#FFC20E", "player", "historic"),
  person("nfl", "Adrian Peterson", "adrian-peterson", "#4F2683", "#FFC62F", "player", "historic"),
  // ── Wide receivers — active ──
  person("nfl", "Tyreek Hill", "tyreek-hill", "#008E97", "#FC4C02", "player", "active"),
  person("nfl", "Justin Jefferson", "justin-jefferson", "#4F2683", "#FFC62F", "player", "active"),
  person("nfl", "Ja'Marr Chase", "ja-marr-chase", "#FB4F14", "#000000", "player", "active"),
  person("nfl", "CeeDee Lamb", "ceedee-lamb", "#003594", "#869397", "player", "active"),
  person("nfl", "Amon-Ra St. Brown", "amon-ra-st-brown", "#0076B6", "#B0B7BC", "player", "active"),
  person("nfl", "Stefon Diggs", "stefon-diggs", "#00338D", "#C60C30", "player", "active"),
  person("nfl", "A.J. Brown", "aj-brown", "#004C54", "#A5ACAF", "player", "active"),

  // ── Wide receivers — historic ──
  person("nfl", "Jerry Rice", "jerry-rice", "#AA0000", "#B3995D", "player", "historic"),
  person("nfl", "Randy Moss", "randy-moss", "#4F2683", "#FFC62F", "player", "historic"),
  person("nfl", "Larry Fitzgerald", "larry-fitzgerald", "#97233F", "#000000", "player", "historic"),
  person("nfl", "Terrell Owens", "terrell-owens", "#003594", "#869397", "player", "historic"),
  person("nfl", "Calvin Johnson", "calvin-johnson", "#0076B6", "#B0B7BC", "player", "historic"),
  person("nfl", "Marvin Harrison", "marvin-harrison", "#002C5F", "#A2AAAD", "player", "historic"),
  person("nfl", "Michael Irvin", "michael-irvin", "#003594", "#869397", "player", "historic"),

  // ── Defense — active ──
  person("nfl", "Aaron Donald", "aaron-donald", "#003594", "#FFA300", "player", "active"),
  person("nfl", "Myles Garrett", "myles-garrett", "#311D00", "#FF3C00", "player", "active"),
  person("nfl", "T.J. Watt", "tj-watt", "#FFB612", "#101820", "player", "active"),
  person("nfl", "Nick Bosa", "nick-bosa", "#AA0000", "#B3995D", "player", "active"),
  person("nfl", "Micah Parsons", "micah-parsons", "#003594", "#869397", "player", "active"),
  person("nfl", "Patrick Surtain II", "patrick-surtain-ii", "#FB4F14", "#002244", "player", "active"),
  person("nfl", "Khalil Mack", "khalil-mack", "#0080C6", "#FFC20E", "player", "active"),

  // ── Defense — historic ──
  person("nfl", "Lawrence Taylor", "lawrence-taylor", "#0B2265", "#A71930", "player", "historic"),
  person("nfl", "Reggie White", "reggie-white", "#203731", "#FFB612", "player", "historic"),
  person("nfl", "Deion Sanders", "deion-sanders", "#003594", "#869397", "player", "historic"),
  person("nfl", "Ray Lewis", "ray-lewis", "#241773", "#9E7C0C", "player", "historic"),
  person("nfl", "Ed Reed", "ed-reed", "#241773", "#9E7C0C", "player", "historic"),
  person("nfl", "Ronnie Lott", "ronnie-lott", "#AA0000", "#B3995D", "player", "historic"),
  person("nfl", "Bruce Smith", "bruce-smith", "#00338D", "#C60C30", "player", "historic"),

  // ── Tight ends & specialists ──
  person("nfl", "Travis Kelce", "travis-kelce", "#E31837", "#FFB612", "player", "active"),
  person("nfl", "George Kittle", "george-kittle", "#AA0000", "#B3995D", "player", "active"),
  person("nfl", "Rob Gronkowski", "rob-gronkowski", "#002244", "#C60C30", "player", "historic"),
  // ── Additional legends ──
  person("nfl", "Aaron Rodgers", "aaron-rodgers", "#203731", "#FFB612", "player", "active"),

  // ── Coaches — active ──
  person("nfl", "Andy Reid", "andy-reid", "#E31837", "#FFB612", "coach", "active"),
  person("nfl", "Bill Belichick", "bill-belichick", "#002244", "#C60C30", "coach", "active"),
  person("nfl", "Sean McVay", "sean-mcvay", "#003594", "#FFA300", "coach", "active"),
  person("nfl", "Kyle Shanahan", "kyle-shanahan", "#AA0000", "#B3995D", "coach", "active"),
  person("nfl", "Mike Tomlin", "mike-tomlin", "#FFB612", "#101820", "coach", "active"),
  person("nfl", "John Harbaugh", "john-harbaugh", "#241773", "#9E7C0C", "coach", "active"),
  person("nfl", "Sean Payton", "sean-payton", "#D3BC8D", "#101820", "coach", "active"),
  person("nfl", "Matt LaFleur", "matt-lafleur", "#203731", "#FFB612", "coach", "active"),
  person("nfl", "Kevin Stefanski", "kevin-stefanski", "#311D00", "#FF3C00", "coach", "active"),
  person("nfl", "Nick Sirianni", "nick-sirianni", "#004C54", "#A5ACAF", "coach", "active"),
  person("nfl", "DeMeco Ryans", "demeco-ryans", "#03202F", "#A71930", "coach", "active"),
  // ── Coaches — historic ──
  person("nfl", "Vince Lombardi", "vince-lombardi", "#203731", "#FFB612", "coach", "historic"),
  person("nfl", "Don Shula", "don-shula", "#008E97", "#FC4C02", "coach", "historic"),
  person("nfl", "Bill Walsh", "bill-walsh", "#AA0000", "#B3995D", "coach", "historic"),
  person("nfl", "Chuck Noll", "chuck-noll", "#FFB612", "#101820", "coach", "historic"),
  person("nfl", "Tom Landry", "tom-landry", "#003594", "#869397", "coach", "historic"),
  person("nfl", "Paul Brown", "paul-brown", "#311D00", "#FF3C00", "coach", "historic"),
  person("nfl", "Bill Parcells", "bill-parcells", "#0B2265", "#A71930", "coach", "historic"),
  person("nfl", "George Halas", "george-halas", "#0B162A", "#C83803", "coach", "historic"),
  person("nfl", "Don Coryell", "don-coryell", "#0080C6", "#FFC20E", "coach", "historic"),
  person("nfl", "Joe Gibbs", "joe-gibbs", "#5A1414", "#FFB612", "coach", "historic"),
  person("nfl", "Tony Dungy", "tony-dungy", "#002C5F", "#A2AAAD", "coach", "historic"),
  person("nfl", "Mike Shanahan", "mike-shanahan", "#FB4F14", "#002244", "coach", "historic"),
  person("nfl", "Jimmy Johnson", "jimmy-johnson", "#008E97", "#FC4C02", "coach", "historic"),
  person("nfl", "John Madden", "john-madden", "#000000", "#A5ACAF", "coach", "historic"),
];
