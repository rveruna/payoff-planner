import { raceSpan } from './RaceChart';
import { comparePlans } from '../domain/engine';
import { DEFAULT_SCENARIO } from '../domain/scenario';

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
