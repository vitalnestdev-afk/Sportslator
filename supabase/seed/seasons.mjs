/** [sport_slug, label, slug, year_start, year_end] */
const recentSeasons = [
  ["2024–25", "2024-25", 2024, 2025],
  ["2023–24", "2023-24", 2023, 2024],
  ["2022–23", "2022-23", 2022, 2023],
  ["2021–22", "2021-22", 2021, 2022],
  ["2020–21", "2020-21", 2020, 2021],
];

const calendarYears = [
  ["2024", "2024", 2024, 2024],
  ["2023", "2023", 2023, 2023],
  ["2022", "2022", 2022, 2022],
  ["2021", "2021", 2021, 2021],
  ["2020", "2020", 2020, 2020],
];

const primeEra = [["Prime years", "prime-years", null, null]];
const allTime = [["All-time", "all-time", null, null]];

const sportSeasons = {
  football: [...recentSeasons, ...allTime],
  nba: [...recentSeasons, ...allTime],
  nfl: [...recentSeasons, ...allTime],
  nhl: [...recentSeasons, ...allTime],
  mlb: [...calendarYears, ...allTime],
  cricket: [...calendarYears, ...allTime],
  f1: [...calendarYears, ...allTime],
  rugby: [...calendarYears, ...allTime],
  tennis: [...calendarYears, ...primeEra],
  golf: [...calendarYears, ...primeEra],
  mma: [...calendarYears, ...primeEra],
  boxing: [...calendarYears, ...primeEra],
};

export const seasons = Object.entries(sportSeasons).flatMap(([sport, rows]) =>
  rows.map(([label, slug, yearStart, yearEnd]) => [
    sport,
    label,
    slug,
    yearStart,
    yearEnd,
  ])
);
