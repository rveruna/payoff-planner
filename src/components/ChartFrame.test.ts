import { monthTicks, short } from './ChartFrame';
import { raceSpan } from './RaceChart';
import { comparePlans } from '../domain/engine';
import { DEFAULT_SCENARIO } from '../domain/scenario';

describe('monthTicks', () => {
  it.each([
    [12, [0, 6, 12]],
    [24, [0, 6, 12, 18, 24]],
    [31, [0, 12, 24]],
    [120, [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120]],
    [200, [0, 24, 48, 72, 96, 120, 144, 168, 192]],
    [600, [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600]],
  ])('for %s months', (xMax, expected) => {
    expect(monthTicks(xMax)).toEqual(expected);
  });
});

describe('short', () => {
  it('writes a month in three letters with the year', () => {
    expect(short('2026-10')).toBe('Oct 2026');
    expect(short('2027-05')).toBe('May 2027');
  });
});

describe('raceSpan', () => {
  it('runs a little past the longest plan that finishes', () => {
    const span = raceSpan(comparePlans(DEFAULT_SCENARIO.debts, DEFAULT_SCENARIO.extra));
    // the minimum plan takes 83 months
    expect(span).toBe(Math.ceil(83 * 1.1));
  });

  it('uses a fixed span when nothing finishes', () => {
    expect(
      raceSpan(comparePlans([{ id: 'a', name: 'A', balance: 100_000, aprBp: 2400, minPayment: 1_000 }], 0)),
    ).toBe(120);
  });

  it('is never less than a year', () => {
    expect(
      raceSpan(comparePlans([{ id: 'a', name: 'A', balance: 1_000, aprBp: 0, minPayment: 1_000 }], 0)),
    ).toBe(12);
  });
});
