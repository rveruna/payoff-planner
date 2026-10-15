import fc from 'fast-check';
import { MAX_MONTHS, comparePlans, simulate } from './engine';
import { monthlyInterest } from './money';
import { priorityOrder } from './strategy';
import type { Debt, Plan } from './types';

const debt = (id: string, balance: number, aprBp: number, minPayment: number): Debt => ({
  id,
  name: id.toUpperCase(),
  balance,
  aprBp,
  minPayment,
});

describe('one debt, checked against an independent calculation', () => {
  /** A separate, deliberately plain implementation using BigInt, for a single debt paid a fixed amount. */
  function reference(balance: number, aprBp: number, payment: number) {
    let owed = BigInt(balance);
    let interestTotal = 0n;
    let months = 0;
    const closings: bigint[] = [];
    while (owed > 0n && months < MAX_MONTHS) {
      const interest = (2n * owed * BigInt(aprBp) + 120_000n) / 240_000n;
      interestTotal += interest;
      const due = owed + interest;
      const pay = due < BigInt(payment) ? due : BigInt(payment);
      owed = due - pay;
      closings.push(owed);
      months++;
    }
    return { months, interest: Number(interestTotal), closings: closings.map(Number) };
  }

  it.each([
    [100_000, 1200, 10_000],
    [250_000, 2490, 7_500],
    [1_000_000, 399, 50_000],
    [50_000, 0, 5_000],
    [333_333, 1999, 12_345],
  ])(
    '£%s pence at %s bp paying %s a month gives the same months, interest and balances',
    (balance, apr, pay) => {
      const plan = simulate([debt('a', balance, apr, pay)], 'avalanche');
      const expected = reference(balance, apr, pay);

      expect(plan.months).toHaveLength(expected.months);
      expect(plan.interest).toBe(expected.interest);
      expect(plan.months.map((m) => m.closing)).toEqual(expected.closings);
    },
  );

  it('takes the number of months the standard repayment formula predicts', () => {
    // £1,000 at 12% a year (1% a month) paying £100: n = -ln(1 - 0.01 * 1000 / 100) / ln(1.01) = 10.59, so 11 months
    const plan = simulate([debt('a', 100_000, 1200, 10_000)], 'avalanche');

    expect(plan.months).toHaveLength(11);
    expect(plan.paidOff).toBe(true);
    // the last payment is smaller than the others, because it only clears what is left
    expect(plan.months[10]!.payment).toBeLessThan(10_000);
    expect(plan.months[9]!.payment).toBe(10_000);
  });
});

describe('two debts, worked out by hand', () => {
  // A: £500 at 10%, minimum £25.   B: £2,000 at 24%, minimum £50.   Extra: £100 a month.
  const debts = [debt('a', 50_000, 1000, 2_500), debt('b', 200_000, 2400, 5_000)];

  it('avalanche puts the extra on the 24% debt', () => {
    const [first] = simulate(debts, 'avalanche', 10_000).months;
    const a = first!.debts.find((d) => d.id === 'a')!;
    const b = first!.debts.find((d) => d.id === 'b')!;

    // interest: A 50,000 x 10% / 12 = 416.67p, so 417p. B 200,000 x 24% / 12 = 4,000p
    expect([a.interest, b.interest]).toEqual([417, 4000]);
    expect([a.minimum, a.extra, a.payment]).toEqual([2500, 0, 2500]);
    expect([b.minimum, b.extra, b.payment]).toEqual([5000, 10_000, 15_000]);
    expect([a.closing, b.closing]).toEqual([47_917, 189_000]);
    expect(first!.order).toEqual(['b', 'a']);
    expect(first!.budget).toBe(17_500);
  });

  it('snowball puts the extra on the smaller debt', () => {
    const [first] = simulate(debts, 'snowball', 10_000).months;
    const a = first!.debts.find((d) => d.id === 'a')!;
    const b = first!.debts.find((d) => d.id === 'b')!;

    expect([a.minimum, a.extra, a.payment]).toEqual([2500, 10_000, 12_500]);
    expect([b.minimum, b.extra, b.payment]).toEqual([5000, 0, 5000]);
    expect([a.closing, b.closing]).toEqual([37_917, 199_000]);
    expect(first!.order).toEqual(['a', 'b']);
  });

  it('the minimum plan ignores the extra', () => {
    const [first] = simulate(debts, 'minimum', 10_000).months;

    expect(first!.debts.map((d) => d.extra)).toEqual([0, 0]);
    expect(first!.payment).toBe(7_500);
    expect(first!.order).toEqual([]);
  });

  it('avalanche costs less interest than snowball here, and both beat the minimum plan', () => {
    const { avalanche, snowball, minimum } = comparePlans(debts, 10_000);

    expect(avalanche.interest).toBeLessThan(snowball.interest);
    expect(snowball.interest).toBeLessThan(minimum.interest);
    expect(avalanche.months.length).toBeLessThanOrEqual(snowball.months.length);
    expect(snowball.months.length).toBeLessThan(minimum.months.length);
  });
});

describe('rolling a cleared debt’s payment on', () => {
  // A: £100 at 0%, minimum £50.   B: £1,000 at 0%, minimum £20.   No extra. All interest-free, so the sums are plain.
  const debts = [debt('a', 10_000, 0, 5_000), debt('b', 100_000, 0, 2_000)];

  it('keeps paying the same total after the first debt is cleared', () => {
    const plan = simulate(debts, 'avalanche');

    expect(plan.clearedIn.a).toBe(2);
    expect(plan.months[0]!.payment).toBe(7_000);
    expect(plan.months[1]!.payment).toBe(7_000);
    // from month 3 only B is left, and it now gets the £50 as well as its own £20
    expect(plan.months[2]!.payment).toBe(7_000);
    expect(plan.months[2]!.debts).toHaveLength(1);
    expect(plan.months[2]!.debts[0]).toMatchObject({ minimum: 2_000, extra: 5_000 });
  });

  it('does not roll anything on in the minimum plan', () => {
    const plan = simulate(debts, 'minimum');

    expect(plan.months[2]!.payment).toBe(2_000);
    expect(plan.months.length).toBeGreaterThan(simulate(debts, 'avalanche').months.length);
  });

  it('finishes on the exact total owed when there is no interest', () => {
    const plan = simulate(debts, 'avalanche');

    expect(plan.paid).toBe(110_000);
    expect(plan.interest).toBe(0);
  });
});

describe('the last month', () => {
  it('pays only what is left and reports the rest of the budget as unused', () => {
    const plan = simulate([debt('a', 15_000, 0, 10_000)], 'avalanche');
    const last = plan.months.at(-1)!;

    expect(plan.months).toHaveLength(2);
    expect(last.payment).toBe(5_000);
    expect(last.budget).toBe(10_000);
    expect(last.unused).toBe(5_000);
    expect(last.closing).toBe(0);
  });
});

describe('debts that never clear', () => {
  const stuck = [debt('a', 100_000, 2400, 1_000)];

  it('is reported as not paid off, after the longest period', () => {
    const plan = simulate(stuck, 'avalanche');

    expect(plan.paidOff).toBe(false);
    expect(plan.months).toHaveLength(MAX_MONTHS);
    expect(plan.clearedIn.a).toBeNull();
  });

  it('grows when the minimum is less than the interest', () => {
    const plan = simulate(stuck, 'minimum', 0, 24);

    expect(plan.months[23]!.closing).toBeGreaterThan(plan.months[0]!.closing);
    expect(plan.months[0]!.closing).toBeGreaterThan(100_000);
  });

  it('is cleared once enough extra is added', () => {
    expect(simulate(stuck, 'avalanche', 20_000).paidOff).toBe(true);
  });

  it('honours a shorter limit', () => {
    expect(simulate(stuck, 'avalanche', 0, 12).months).toHaveLength(12);
  });
});

describe('edge cases', () => {
  it('has nothing to do with no debts', () => {
    const plan = simulate([], 'avalanche', 5_000);

    expect(plan).toMatchObject({ months: [], paidOff: true, interest: 0, paid: 0 });
  });

  it('ignores debts with no balance', () => {
    const plan = simulate([debt('a', 0, 2400, 1_000), debt('b', 10_000, 0, 10_000)], 'avalanche');

    expect(plan.months).toHaveLength(1);
    expect(Object.keys(plan.clearedIn)).toEqual(['b']);
  });

  it('clears a debt in one month if the minimum covers it', () => {
    const plan = simulate([debt('a', 1_000, 2400, 5_000)], 'avalanche');

    expect(plan.months).toHaveLength(1);
    expect(plan.months[0]!.debts[0]).toMatchObject({
      opening: 1_000,
      interest: 20,
      payment: 1_020,
      closing: 0,
    });
  });

  it('can be paid off by the extra alone when the minimum is zero', () => {
    const plan = simulate([debt('a', 10_000, 0, 0)], 'avalanche', 5_000);

    expect(plan.months).toHaveLength(2);
    expect(plan.paidOff).toBe(true);
  });

  it('does not depend on the order the debts are listed in', () => {
    const list = [
      debt('a', 50_000, 1000, 2_500),
      debt('b', 200_000, 2400, 5_000),
      debt('c', 80_000, 1999, 3_000),
    ];

    for (const strategy of ['avalanche', 'snowball', 'minimum'] as const) {
      const forward = simulate(list, strategy, 8_000);
      const backward = simulate([...list].reverse(), strategy, 8_000);
      expect(backward.interest).toBe(forward.interest);
      expect(backward.months.map((m) => m.closing)).toEqual(forward.months.map((m) => m.closing));
    }
  });

  it('does not change the debts it is given', () => {
    const list = [debt('a', 50_000, 1000, 2_500)];
    const before = JSON.stringify(list);
    simulate(list, 'avalanche', 1_000);
    expect(JSON.stringify(list)).toBe(before);
  });
});

describe('priorityOrder', () => {
  const open = [
    { id: 'big-low', aprBp: 500, balance: 900_000 },
    { id: 'small-high', aprBp: 2900, balance: 30_000 },
    { id: 'mid-high', aprBp: 2900, balance: 120_000 },
    { id: 'a-small-low', aprBp: 100, balance: 30_000 },
  ];

  it('avalanche is highest rate first, then the smaller balance', () => {
    expect(priorityOrder('avalanche', open)).toEqual(['small-high', 'mid-high', 'big-low', 'a-small-low']);
  });

  it('snowball is smallest balance first, then the higher rate', () => {
    expect(priorityOrder('snowball', open)).toEqual(['small-high', 'a-small-low', 'mid-high', 'big-low']);
  });

  it('settles a complete tie by id', () => {
    const tied = [
      { id: 'b', aprBp: 1000, balance: 100 },
      { id: 'a', aprBp: 1000, balance: 100 },
    ];
    expect(priorityOrder('avalanche', tied)).toEqual(['a', 'b']);
    expect(priorityOrder('snowball', tied)).toEqual(['a', 'b']);
  });

  it('does not change the list it is given', () => {
    const copy = [...open];
    priorityOrder('avalanche', open);
    expect(open).toEqual(copy);
  });
});

/**
 * Debts that can be paid off within the 50-year limit: each month's minimum covers the interest and at least a
 * three-hundredth of the balance, so the balance falls steadily.
 */
const debtsArb = fc
  .array(
    fc.record({
      balance: fc.integer({ min: 1_000, max: 5_000_000 }),
      aprBp: fc.integer({ min: 0, max: 4_000 }),
      cushion: fc.integer({ min: 100, max: 50_000 }),
    }),
    { minLength: 1, maxLength: 5 },
  )
  .map((list) =>
    list.map((d, i) =>
      debt(
        `d${i}`,
        d.balance,
        d.aprBp,
        monthlyInterest(d.balance, d.aprBp) + Math.ceil(d.balance / 300) + d.cushion,
      ),
    ),
  );
const extraArb = fc.integer({ min: 0, max: 100_000 });

describe('properties that must hold for any debts', () => {
  const check = (name: string, property: (plan: Plan, debts: Debt[], extra: number) => void) =>
    it(name, () => {
      fc.assert(
        fc.property(
          debtsArb,
          extraArb,
          fc.constantFrom('avalanche', 'snowball', 'minimum' as const),
          (debts, extra, strategy) => {
            property(simulate(debts, strategy, extra), debts, extra);
          },
        ),
        { numRuns: 150 },
      );
    });

  check('no balance ever goes below zero, and every figure is a whole number of pence', (plan) => {
    for (const month of plan.months) {
      for (const d of month.debts) {
        for (const value of [d.opening, d.interest, d.minimum, d.extra, d.payment, d.closing]) {
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  check('each month the closing balance is opening plus interest minus payment', (plan) => {
    for (const month of plan.months) {
      for (const d of month.debts) expect(d.closing).toBe(d.opening + d.interest - d.payment);
    }
  });

  check('a month’s balances carry into the next month', (plan) => {
    for (let i = 1; i < plan.months.length; i++) {
      const previous = new Map(plan.months[i - 1]!.debts.map((d) => [d.id, d.closing]));
      for (const d of plan.months[i]!.debts) expect(d.opening).toBe(previous.get(d.id));
    }
  });

  check('nothing is paid beyond what is owed, and the payment is the minimum plus the extra', (plan) => {
    for (const month of plan.months) {
      for (const d of month.debts) {
        expect(d.payment).toBe(d.minimum + d.extra);
        expect(d.payment).toBeLessThanOrEqual(d.opening + d.interest);
      }
    }
  });

  check('never pays more in a month than the budget, and accounts for all of it', (plan) => {
    for (const month of plan.months) {
      expect(month.payment).toBeLessThanOrEqual(month.budget);
      expect(month.payment + month.unused).toBe(month.budget);
    }
  });

  check('uses all of the budget in every month but the last, for the plans that roll payments on', (plan) => {
    if (plan.strategy === 'minimum') return;
    for (const month of plan.months.slice(0, -1)) expect(month.unused).toBe(0);
  });

  check('ends with everything paid, and the total paid is what was owed plus the interest', (plan, debts) => {
    expect(plan.paidOff).toBe(true);
    const owed = debts.reduce((sum, d) => sum + d.balance, 0);
    expect(plan.paid).toBe(owed + plan.interest);
    expect(plan.months.at(-1)!.closing).toBe(0);
  });

  check('records the month each debt is cleared in', (plan, debts) => {
    for (const d of debts) {
      const month = plan.clearedIn[d.id]!;
      expect(month).toBeGreaterThan(0);
      const row = plan.months[month - 1]!.debts.find((x) => x.id === d.id)!;
      expect(row.closing).toBe(0);
      expect(plan.months.slice(month).some((m) => m.debts.some((x) => x.id === d.id))).toBe(false);
    }
  });

  check('gives the same answer every time', (plan, debts, extra) => {
    expect(simulate(debts, plan.strategy, extra)).toEqual(plan);
  });
});

describe('comparing strategies, for any debts', () => {
  const run = (property: (c: ReturnType<typeof comparePlans>, extra: number) => void) =>
    fc.assert(
      fc.property(debtsArb, extraArb, (debts, extra) => {
        property(comparePlans(debts, extra), extra);
      }),
      { numRuns: 150 },
    );

  it('rolling the payments on never takes longer or costs more than the minimum plan', () => {
    run(({ avalanche, snowball, minimum }) => {
      for (const plan of [avalanche, snowball]) {
        expect(plan.months.length).toBeLessThanOrEqual(minimum.months.length);
        expect(plan.interest).toBeLessThanOrEqual(minimum.interest);
      }
    });
  });

  it('avalanche costs no more interest than snowball, apart from a few pence of rounding', () => {
    run(({ avalanche, snowball }) => {
      // interest is rounded to the nearest penny for each debt each month, so allow that much slack
      const slack = Math.max(avalanche.months.length, snowball.months.length) * 5;
      expect(avalanche.interest).toBeLessThanOrEqual(snowball.interest + slack);
    });
  });

  it('paying more each month never makes an avalanche plan longer', () => {
    fc.assert(
      fc.property(debtsArb, extraArb, fc.integer({ min: 1, max: 50_000 }), (debts, extra, more) => {
        const less = simulate(debts, 'avalanche', extra);
        const extraMore = simulate(debts, 'avalanche', extra + more);
        expect(extraMore.months.length).toBeLessThanOrEqual(less.months.length);
      }),
      { numRuns: 150 },
    );
  });

  it('paying more each month never costs more interest under avalanche, apart from rounding', () => {
    fc.assert(
      fc.property(debtsArb, extraArb, fc.integer({ min: 1, max: 50_000 }), (debts, extra, more) => {
        const less = simulate(debts, 'avalanche', extra);
        const extraMore = simulate(debts, 'avalanche', extra + more);
        // a few pence of slack for the rounding of each month's interest
        expect(extraMore.interest).toBeLessThanOrEqual(less.interest + less.months.length * 5);
      }),
      { numRuns: 150 },
    );
  });

  it('can cost a little more interest under snowball when more is paid, because the order of clearing changes', () => {
    // Found by the property test above before it was limited to avalanche. The smaller debt is interest-free, so snowball
    // clears it first; a bigger budget changes how the money is split, and the total interest is 131 pence higher even
    // though the debts are cleared three months sooner. It is a real property of snowball, not a bug.
    const debts = [debt('d0', 131_460, 0, 539), debt('d1', 499_747, 1992, 27_195)];
    const less = simulate(debts, 'snowball', 818);
    const more = simulate(debts, 'snowball', 818 + 3_498);

    expect(more.months.length).toBeLessThan(less.months.length);
    expect(more.interest).toBeGreaterThan(less.interest);
    // avalanche, on the same debts, does improve
    expect(simulate(debts, 'avalanche', 818 + 3_498).interest).toBeLessThan(
      simulate(debts, 'avalanche', 818).interest,
    );
  });

  it('can take longer under snowball with a single penny more, because two balances cross and the order flips', () => {
    // Found by a search of 60,000 random cases. Around month 30 the balances of d1 (26%) and d2 (12.64%) are nearly equal.
    // With 37,299 pence extra, d1 is the smaller and is paid first. With 37,300, d2 is the smaller by a whisker, so the
    // money goes to the cheaper debt first, and the plan is two months longer and costs 2,809.90 more in interest.
    // Snowball ranks by balance, which is a discontinuous rule, so a tiny change can flip the whole order.
    const debts = [
      debt('d0', 363_090, 0, 1_311),
      debt('d1', 2_359_131, 2_600, 68_786),
      debt('d2', 2_201_650, 1_264, 33_359),
      debt('d3', 1_010_651, 226, 44_109),
    ];
    const a = simulate(debts, 'snowball', 37_299);
    const b = simulate(debts, 'snowball', 37_300);

    expect([a.months.length, b.months.length]).toEqual([43, 45]);
    expect(b.interest - a.interest).toBe(280_990);
    // avalanche on the same debts is not affected: its order depends on rates, which never change
    expect(simulate(debts, 'avalanche', 37_300).months.length).toBeLessThanOrEqual(
      simulate(debts, 'avalanche', 37_299).months.length,
    );
  });
});
