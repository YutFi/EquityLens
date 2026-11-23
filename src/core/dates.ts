/** Date helpers operating on YYYY-MM-DD strings in UTC so results never depend on the user's time zone. */

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  return toISODate(new Date(parseISODate(s).getTime() + n * 86_400_000));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);
}

/** Monday of the ISO week containing the date. */
export function isoWeekStart(s: string): string {
  const dow = (parseISODate(s).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(s, -dow);
}

/** Number of weekdays (Mon-Fri) strictly between two dates. Public holidays are not considered. */
export function weekdaysBetween(a: string, b: string): number {
  let count = 0;
  const total = daysBetween(a, b);
  for (let i = 1; i < total; i++) {
    const dow = parseISODate(addDays(a, i)).getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISODate(parseISODate(s)) === s;
}
