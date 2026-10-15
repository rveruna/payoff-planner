import fc from 'fast-check';
import {
  areaPath,
  balanceSeries,
  clearOrder,
  linePath,
  linearScale,
  monthTicks,
  niceTicks,
  stackBands,
} from './chart';
import { simulate } from './engine';
import type { Debt } from './types';

const debt = (id: string, name: string, balance: number, aprBp: number, minPayment: number): Debt => ({
  id,
  name,
  balance,
  aprBp,
  minPayment,
});

describe('linearScale', () => {
  it('maps the ends of the domain to the ends of the range', () => {
    const scale = linearScale([0, 100], [10, 210]);
    expect([scale(0), scale(100), scale(50)]).toEqual([10, 210, 110]);
  });

  it('can run backwards, as a chart’s y axis does', () => {
    const scale = linearScale([0, 1000], [300, 0]);
    expect([scale(0), scale(1000), scale(250)]).toEqual([300, 0, 225]);
  });

  it('puts everything at the start of the range when the domain is flat', () => {
    expect(linearScale([5, 5], [0, 100])(5)).toBe(0);
  });

  it('is monotonic for any ranges', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        (d0, dSpan, r0, rSpan) => {
          const scale = linearScale([d0, d0 + dSpan], [r0, r0 + rSpan]);
          expect(scale(d0 + dSpan / 2)).toBeGreaterThanOrEqual(scale(d0));
          expect(scale(d0 + dSpan)).toBeGreaterThanOrEqual(scale(d0 + dSpan / 2));
        },
      ),
    );
  });
});

describe('niceTicks', () => {
  it.each([
    [1000, [0, 200, 400, 600, 800, 1000]],
    [950, [0, 200, 400, 600, 800, 1000]],
    [7, [0, 2, 4, 6, 8]],
    [100_000, [0, 20_000, 40_000, 60_000, 80_000, 100_000]],
  ])('for a maximum of %s', (max, expected) => {
    expect(niceTicks(max)).toEqual(expected);
  });

  it('is just zero when there is nothing to show', () => {
    expect(niceTicks(0)).toEqual([0]);
    expect(niceTicks(-5)).toEqual([0]);
  });

  it('always starts at zero, rises, and reaches the maximum', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000_000 }),
        fc.integer({ min: 2, max: 8 }),
        (max, count) => {
          const ticks = niceTicks(max, count);
          expect(ticks[0]).toBe(0);
          expect(ticks.at(-1)!).toBeGreaterThanOrEqual(max);
          for (let i = 1; i < ticks.length; i++) expect(ticks[i]!).toBeGreaterThan(ticks[i - 1]!);
          expect(ticks.length).toBeLessThanOrEqual(count + 3);
        },
      ),
    );
  });
});

describe('paths', () => {
  it('draws a line through the points', () => {
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 5.123, y: 2 },
      ]),
    ).toBe('M0.00 10.00 L5.12 2.00');
  });

  it('draws nothing for no points', () => {
    expect(linePath([])).toBe('');
    expect(areaPath([], [])).toBe('');
  });

  it('closes an area by returning along the bottom edge', () => {
    const top = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const bottom = [
      { x: 0, y: 5 },
      { x: 10, y: 5 },
    ];

    expect(areaPath(top, bottom)).toBe('M0.00 0.00 L10.00 0.00 L10.00 5.00 L0.00 5.00 Z');
  });
});

describe('balanceSeries', () => {
  it('starts with the total owed and then follows each month’s closing balance', () => {
    const debts = [debt('a', 'A', 20_000, 0, 10_000)];
    const plan = simulate(debts, 'avalanche');

    expect(balanceSeries(plan, 20_000)).toEqual([20_000, 10_000, 0]);
  });
});

describe('clearOrder', () => {
  const debts = [
    debt('big', 'Big', 100_000, 0, 5_000),
    debt('small', 'Small', 10_000, 0, 5_000),
    debt('zero', 'Zero', 0, 0, 0),
  ];

  it('lists the debts in the order they are cleared, leaving out any with no balance', () => {
    const plan = simulate(debts, 'avalanche');
    expect(clearOrder(debts, plan).map((d) => d.id)).toEqual(['small', 'big']);
  });

  it('puts debts that are never cleared last', () => {
    const stuck = [debt('a', 'A', 100_000, 3000, 100), debt('b', 'B', 1_000, 0, 1_000)];
    const plan = simulate(stuck, 'minimum');
    expect(clearOrder(stuck, plan).map((d) => d.id)).toEqual(['b', 'a']);
  });
});

describe('stackBands', () => {
  const debts = [debt('a', 'A', 30_000, 0, 10_000), debt('b', 'B', 10_000, 0, 10_000)];
  const plan = simulate(debts, 'avalanche');
  const bands = stackBands(debts, plan);

  it('puts the debt cleared last at the bottom, so the stack peels from the top', () => {
    expect(bands.map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('has a layer for the start and for each month', () => {
    for (const band of bands) expect(band.layers).toHaveLength(plan.months.length + 1);
  });

  it('starts with each debt’s balance, stacked', () => {
    expect(bands[0]!.layers[0]).toEqual({ lower: 0, upper: 30_000 });
    expect(bands[1]!.layers[0]).toEqual({ lower: 30_000, upper: 40_000 });
  });

  it('shrinks to nothing as the debts are cleared', () => {
    const last = bands.at(-1)!.layers.at(-1)!;
    expect(last).toEqual({ lower: 0, upper: 0 });
  });

  it('adds up, at every month, to the total still owed', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            balance: fc.integer({ min: 1_000, max: 1_000_000 }),
            apr: fc.integer({ min: 0, max: 3_000 }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        fc.integer({ min: 0, max: 50_000 }),
        (list, extra) => {
          const many = list.map((d, i) =>
            debt(
              `d${i}`,
              `D${i}`,
              d.balance,
              d.apr,
              Math.ceil(d.balance / 100) + Math.ceil((d.balance * d.apr) / 120_000) + 50,
            ),
          );
          const p = simulate(many, 'avalanche', extra);
          const stacked = stackBands(many, p);
          const total = many.reduce((s, d) => s + d.balance, 0);
          const series = balanceSeries(p, total);
          for (let month = 0; month < series.length; month++) {
            expect(stacked.at(-1)!.layers[month]!.upper).toBe(series[month]);
          }
        },
      ),
      { numRuns: 80 },
    );
  });
});

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
