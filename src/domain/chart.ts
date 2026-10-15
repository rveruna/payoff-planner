import type { Pence } from './money';
import type { Debt, Plan } from './types';

/** Maps a value from one range onto another, in a straight line. A flat domain maps everything to the start. */
export function linearScale(domain: [number, number], range: [number, number]): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return () => r0;
  return (value) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

/** Round numbers from 0 up to at least `max`, using steps of 1, 2 or 5 times a power of ten, about `count` of them. */
export function niceTicks(max: number, count = 5): number[] {
  if (max <= 0) return [0];
  const rough = max / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough)!;
  const ticks: number[] = [];
  for (let value = 0; value < max + step; value += step) {
    ticks.push(value);
    if (value >= max) break;
  }
  return ticks;
}

export interface Point {
  x: number;
  y: number;
}

/** "M x y L x y ..." with the coordinates to two decimal places. */
export function linePath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

/** A closed shape between a top edge and a bottom edge, both given left to right. */
export function areaPath(top: Point[], bottom: Point[]): string {
  if (top.length === 0) return '';
  const back = [...bottom].reverse();
  return `${linePath(top)} ${back.map((p) => `L${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')} Z`;
}

/** The total still owed at the start (month 0) and at the end of each month. */
export function balanceSeries(plan: Plan, startingTotal: Pence): Pence[] {
  return [startingTotal, ...plan.months.map((m) => m.closing)];
}

/** The debts in the order they are cleared, then by name; any that are never cleared come last. */
export function clearOrder(debts: Debt[], plan: Plan): Debt[] {
  const at = (d: Debt) => plan.clearedIn[d.id] ?? Number.POSITIVE_INFINITY;
  return debts
    .filter((d) => d.balance > 0)
    .sort((a, b) => at(a) - at(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export interface Band {
  id: string;
  /** For each month from 0, the bottom and top of the band, in pence from the bottom of the stack. */
  layers: { lower: Pence; upper: Pence }[];
}

/**
 * Stacks each debt's balance over the months. The debt cleared last is at the bottom and the one cleared first at the top,
 * so the stack peels away from the top as the debts are cleared.
 */
export function stackBands(debts: Debt[], plan: Plan): Band[] {
  const order = clearOrder(debts, plan).reverse();
  const months = plan.months.length;
  const balanceAt = (id: string, month: number): Pence => {
    if (month === 0) return debts.find((d) => d.id === id)!.balance;
    return plan.months[month - 1]!.debts.find((d) => d.id === id)?.closing ?? 0;
  };
  const running = new Array<number>(months + 1).fill(0);
  return order.map((debt) => {
    const layers = running.map((lower, month) => {
      const upper = lower + balanceAt(debt.id, month);
      running[month] = upper;
      return { lower, upper };
    });
    return { id: debt.id, layers };
  });
}

/** Month ticks that are a whole number of years apart, or half years for a short plan. */
export function monthTicks(xMax: number): number[] {
  const step = xMax <= 24 ? 6 : xMax <= 120 ? 12 : xMax <= 300 ? 24 : 60;
  const ticks: number[] = [];
  for (let m = 0; m <= xMax; m += step) ticks.push(m);
  return ticks;
}
