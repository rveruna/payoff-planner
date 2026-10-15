import fc from 'fast-check';
import { simulate } from './engine';
import { checkInterest, explainMonth } from './explain';
import { monthlyInterest } from './money';
import type { Debt } from './types';

const debt = (id: string, name: string, balance: number, aprBp: number, minPayment: number): Debt => ({
  id,
  name,
  balance,
  aprBp,
  minPayment,
});

const A = debt('a', 'Store card', 50_000, 1000, 2_500);
const B = debt('b', 'Credit card', 200_000, 2400, 5_000);

describe('explainMonth', () => {
  it('shows the interest sum so it can be checked with a calculator', () => {
    const plan = simulate([A, B], 'avalanche', 10_000);
    const month = explainMonth(plan, [A, B], 1)!;

    const b = month.steps.find((s) => s.id === 'b')!;
    // 200,000p x 24% / 12 is exactly 4,000p, so there is no mention of rounding
    expect(b.interestWorking).toBe('£2,000.00 × 24% ÷ 12 = £40.00');
    const a = month.steps.find((s) => s.id === 'a')!;
    // 50,000p x 10% / 12 is 416.67p, which is rounded
    expect(a.interestWorking).toBe('£500.00 × 10% ÷ 12 = £4.17 (rounded to the nearest penny)');
  });

  it('says where the extra went and why, for avalanche', () => {
    const plan = simulate([A, B], 'avalanche', 10_000);
    const month = explainMonth(plan, [A, B], 1)!;

    expect(month.steps.find((s) => s.id === 'b')!.extraReason).toBe(
      'The extra goes here first: the highest interest rate of the debts still open (24%)',
    );
    expect(month.steps.find((s) => s.id === 'a')!.extraReason).toBeNull();
  });

  it('says where the extra went and why, for snowball', () => {
    const plan = simulate([A, B], 'snowball', 10_000);
    const month = explainMonth(plan, [A, B], 1)!;

    expect(month.steps.find((s) => s.id === 'a')!.extraReason).toBe(
      'The extra goes here first: the smallest balance of the debts still open (£500.00)',
    );
  });

  it('says what the budget is made of', () => {
    const plan = simulate([A, B], 'avalanche', 10_000);

    expect(explainMonth(plan, [A, B], 1)!.budgetWorking).toBe(
      '£175.00 to spend = £75.00 of minimums across every debt + £100.00 extra',
    );
  });

  it('says how much has rolled on from a debt that is already cleared', () => {
    const small = debt('s', 'Small', 10_000, 0, 5_000);
    const big = debt('g', 'Big', 100_000, 0, 2_000);
    const plan = simulate([small, big], 'avalanche');
    const month = explainMonth(plan, [small, big], 3)!;

    expect(month.budgetWorking).toContain('has rolled on from debts already cleared');
    expect(month.budgetWorking).toContain('£50.00');
  });

  it('explains the extra going on to the next debt once the first is cleared', () => {
    const tiny = debt('t', 'Tiny', 1_000, 0, 500);
    const next = debt('n', 'Next', 100_000, 0, 500);
    const plan = simulate([tiny, next], 'snowball', 5_000);
    const month = explainMonth(plan, [tiny, next], 1)!;

    expect(month.cleared).toEqual(['Tiny']);
    expect(month.steps.find((s) => s.id === 'n')!.extraReason).toBe(
      'What was left after Tiny was cleared goes next: the smallest balance of the debts still open (£1,000.00)',
    );
  });

  it('explains the minimum plan', () => {
    const plan = simulate([A, B], 'minimum', 10_000);
    const month = explainMonth(plan, [A, B], 1)!;

    expect(month.budgetWorking).toContain(
      'Nothing rolls on when a debt is cleared, and the extra is not used',
    );
    expect(month.steps.every((s) => s.extraReason === null)).toBe(true);
  });

  it('notes when a payment is smaller because that is all that was owed', () => {
    const plan = simulate([debt('x', 'Last', 1_000, 1200, 5_000)], 'avalanche');
    const [step] = explainMonth(plan, [debt('x', 'Last', 1_000, 1200, 5_000)], 1)!.steps;

    expect(step!.minimumNote).toBe('Only £10.10 was owed, so that is all that is paid');
    expect(step!.cleared).toBe(true);
  });

  it('adds no note when the full minimum is paid, which is every month but the last', () => {
    const plan = simulate([A, B], 'avalanche', 10_000);

    for (const step of explainMonth(plan, [A, B], 1)!.steps) expect(step.minimumNote).toBeNull();
  });

  it('reports what was left over in the last month', () => {
    const plan = simulate([debt('x', 'Last', 15_000, 0, 10_000)], 'avalanche');

    expect(explainMonth(plan, [debt('x', 'Last', 15_000, 0, 10_000)], 2)!.unused).toBe(5_000);
  });

  it('gives nothing for a month that is not in the plan', () => {
    const plan = simulate([A], 'avalanche');
    expect(explainMonth(plan, [A], 0)).toBeNull();
    expect(explainMonth(plan, [A], 9999)).toBeNull();
  });

  it('uses the debt’s name, and falls back to its id', () => {
    const plan = simulate([A], 'avalanche');
    expect(explainMonth(plan, [A], 1)!.steps[0]!.name).toBe('Store card');
  });
});

describe('the explanation never disagrees with the plan', () => {
  const debtsArb = fc
    .array(
      fc.record({
        balance: fc.integer({ min: 1_000, max: 2_000_000 }),
        aprBp: fc.integer({ min: 0, max: 4_000 }),
        cushion: fc.integer({ min: 100, max: 30_000 }),
      }),
      { minLength: 1, maxLength: 4 },
    )
    .map((list) =>
      list.map((d, i) =>
        debt(
          `d${i}`,
          `Debt ${i}`,
          d.balance,
          d.aprBp,
          monthlyInterest(d.balance, d.aprBp) + Math.ceil(d.balance / 300) + d.cushion,
        ),
      ),
    );

  it('shows the same numbers as the plan for every month, and the interest sum is honest', () => {
    fc.assert(
      fc.property(
        debtsArb,
        fc.integer({ min: 0, max: 50_000 }),
        fc.constantFrom('avalanche', 'snowball', 'minimum' as const),
        (debts, extra, strategy) => {
          const plan = simulate(debts, strategy, extra);
          plan.months.forEach((row, i) => {
            const month = explainMonth(plan, debts, i + 1)!;
            expect(month.steps).toHaveLength(row.debts.length);
            month.steps.forEach((step, j) => {
              const d = row.debts[j]!;
              expect([
                step.opening,
                step.interest,
                step.minimum,
                step.extra,
                step.payment,
                step.closing,
              ]).toEqual([d.opening, d.interest, d.minimum, d.extra, d.payment, d.closing]);
              expect(checkInterest(step, debts.find((x) => x.id === step.id)!.aprBp)).toBe(true);
              // the working includes the interest figure it claims
              expect(step.interestWorking).toContain(
                `= £${(d.interest / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
              );
              expect(step.opening + step.interest - step.payment).toBe(step.closing);
            });
          });
        },
      ),
      { numRuns: 60 },
    );
  });
});
