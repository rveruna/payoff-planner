/** A calendar month as "2026-11". */
export type Month = string;

const PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): value is Month {
  return PATTERN.test(value);
}

/** The month a date falls in, in the viewer's own time zone. */
export function monthOf(date: Date): Month {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** The month `count` months after (or before, if negative) the given one. */
export function addMonths(month: Month, count: number): Month {
  const match = PATTERN.exec(month);
  if (!match) throw new Error(`Not a month: ${month}`);
  const index = Number(match[1]) * 12 + (Number(match[2]) - 1) + count;
  const year = Math.floor(index / 12);
  return `${String(year).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

const NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "November 2026". */
export function formatMonth(month: Month): string {
  const match = PATTERN.exec(month);
  if (!match) throw new Error(`Not a month: ${month}`);
  return `${NAMES[Number(match[2]) - 1]} ${match[1]}`;
}

/** "3 years 4 months", "1 year", "11 months". */
export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (rest > 0 || years === 0) parts.push(`${rest} ${rest === 1 ? 'month' : 'months'}`);
  return parts.join(' ');
}

/** "Oct 2026": the first three letters of the month and the year. */
export function shortMonth(month: Month): string {
  return formatMonth(month).replace(/^(\w{3})\w*/, '$1');
}
