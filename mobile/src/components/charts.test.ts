import { comparePlans } from '@domain/engine';
import { DEFAULT_SCENARIO } from '@domain/scenario';
import { finishMonth, raceSpan } from './charts';

describe('raceSpan', () => {
  it('runs a little past the longest plan that finishes', () => {
    // the minimum plan takes 83 months
    expect(raceSpan(comparePlans(DEFAULT_SCENARIO.debts, DEFAULT_SCENARIO.extra))).toBe(Math.ceil(83 * 1.1));
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

describe('finishMonth', () => {
  it('is the month of the last payment', () => {
    const { avalanche } = comparePlans(DEFAULT_SCENARIO.debts, DEFAULT_SCENARIO.extra);
    expect(finishMonth(avalanche, '2026-10')).toBe('2029-04');
  });

  it('is the start month for a plan with nothing in it', () => {
    expect(finishMonth(comparePlans([], 0).avalanche, '2026-10')).toBe('2026-10');
  });
});
