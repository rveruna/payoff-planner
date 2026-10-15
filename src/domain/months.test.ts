import fc from 'fast-check';
import { addMonths, formatDuration, formatMonth, isMonth, monthOf, shortMonth } from './months';

describe('isMonth', () => {
  it.each(['2026-11', '2026-01', '0999-12'])('accepts %s', (value) => {
    expect(isMonth(value)).toBe(true);
  });

  it.each(['2026-13', '2026-00', '2026-1', '26-11', '2026-11-01', '', 'November'])('refuses %j', (value) => {
    expect(isMonth(value)).toBe(false);
  });
});

describe('monthOf', () => {
  it('gives the year and month of a date', () => {
    expect(monthOf(new Date(2026, 10, 15))).toBe('2026-11');
    expect(monthOf(new Date(2027, 0, 1))).toBe('2027-01');
  });
});

describe('addMonths', () => {
  it.each([
    ['2026-11', 0, '2026-11'],
    ['2026-11', 1, '2026-12'],
    ['2026-11', 2, '2027-01'],
    ['2026-01', -1, '2025-12'],
    ['2026-11', 12, '2027-11'],
    ['2026-11', 37, '2029-12'],
    ['2026-12', 1, '2027-01'],
  ])('%s plus %s months is %s', (month, count, expected) => {
    expect(addMonths(month, count)).toBe(expected);
  });

  it('is reversible, and always gives a real month', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1900, max: 2200 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: -1200, max: 1200 }),
        (y, m, n) => {
          const start = `${y}-${String(m).padStart(2, '0')}`;
          const moved = addMonths(start, n);
          expect(isMonth(moved)).toBe(true);
          expect(addMonths(moved, -n)).toBe(start);
        },
      ),
    );
  });

  it('refuses something that is not a month', () => {
    expect(() => addMonths('soon', 1)).toThrow();
  });
});

describe('formatMonth', () => {
  it('writes the month out', () => {
    expect(formatMonth('2026-11')).toBe('November 2026');
    expect(formatMonth('2030-01')).toBe('January 2030');
  });

  it('refuses something that is not a month', () => {
    expect(() => formatMonth('2026-13')).toThrow();
  });
});

describe('formatDuration', () => {
  it.each([
    [1, '1 month'],
    [11, '11 months'],
    [12, '1 year'],
    [13, '1 year 1 month'],
    [40, '3 years 4 months'],
    [24, '2 years'],
    [0, '0 months'],
  ])('%s months is %s', (months, text) => {
    expect(formatDuration(months)).toBe(text);
  });
});

describe('shortMonth', () => {
  it('writes a month in three letters with the year', () => {
    expect(shortMonth('2026-10')).toBe('Oct 2026');
    expect(shortMonth('2027-05')).toBe('May 2027');
  });
});
