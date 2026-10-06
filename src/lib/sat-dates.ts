// Confirmed SAT Weekend dates, verified 2026-10-05. U.S. and international dates are the same.
// https://satsuite.collegeboard.org/sat/dates-deadlines
export const SAT_DATES = ["2026-10-03", "2026-11-07", "2026-12-05", "2027-03-06", "2027-05-01", "2027-06-05"] as const;
export const isSatDate = (value: string) => SAT_DATES.some((date) => date === value);

export function upcomingSatDates(today: string) {
  return SAT_DATES.filter((date) => date >= today);
}
