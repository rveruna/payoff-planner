import { monthlyInterest, type Pence } from './money';
import { priorityOrder } from './strategy';
import type { Debt, DebtMonth, MonthRow, Plan, Strategy } from './types';

/** The longest plan worked out: 50 years. A plan that is not finished by then is reported as never paid off. */
export const MAX_MONTHS = 600;

/**
 * Works out, month by month, how a set of debts is paid off.
 *
 * Each month:
 * 1. Every debt that is still open is charged a month of interest.
 * 2. Every open debt gets its minimum payment, or whatever is left of it if that is less than the minimum.
 * 3. For avalanche and snowball, what remains of the budget (all the minimums, including those of debts that are already
 *    cleared, plus the extra) goes to the open debts in priority order, each taking what it needs, so a cleared debt's
 *    payment rolls on to the next one. The minimum plan has no rolling and no extra.
 *
 * All amounts are whole pence, and interest is rounded to the nearest penny, half up.
 */
export function simulate(
  debts: Debt[],
  strategy: Strategy,
  extra: Pence = 0,
  maxMonths: number = MAX_MONTHS,
): Plan {
  const tracked = debts.filter((d) => d.balance > 0);
  const balance = new Map(tracked.map((d) => [d.id, d.balance]));
  const rolling = strategy !== 'minimum';
  const budget = tracked.reduce((sum, d) => sum + d.minPayment, 0) + extra;

  const months: MonthRow[] = [];
  const clearedIn: Record<string, number | null> = Object.fromEntries(tracked.map((d) => [d.id, null]));
  let interestTotal = 0;
  let paidTotal = 0;

  for (let month = 1; month <= maxMonths; month++) {
    const open = tracked.filter((d) => (balance.get(d.id) ?? 0) > 0);
    if (open.length === 0) break;

    const lines = open.map((d) => {
      const opening = balance.get(d.id)!;
      const interest = monthlyInterest(opening, d.aprBp);
      const accrued = opening + interest;
      return { debt: d, opening, interest, accrued, minimum: Math.min(d.minPayment, accrued), extra: 0 };
    });

    const order = rolling
      ? priorityOrder(
          strategy as Exclude<Strategy, 'minimum'>,
          lines.map((l) => ({ id: l.debt.id, aprBp: l.debt.aprBp, balance: l.opening })),
        )
      : [];
    const available = rolling ? budget : lines.reduce((sum, l) => sum + l.minimum, 0);
    let remaining = available - lines.reduce((sum, l) => sum + l.minimum, 0);

    for (const id of order) {
      if (remaining <= 0) break;
      const line = lines.find((l) => l.debt.id === id)!;
      const give = Math.min(remaining, line.accrued - line.minimum);
      line.extra = give;
      remaining -= give;
    }

    const debtMonths: DebtMonth[] = lines.map((l) => {
      const payment = l.minimum + l.extra;
      return {
        id: l.debt.id,
        opening: l.opening,
        interest: l.interest,
        minimum: l.minimum,
        extra: l.extra,
        payment,
        closing: l.accrued - payment,
      };
    });
    for (const d of debtMonths) {
      balance.set(d.id, d.closing);
      if (d.closing === 0) clearedIn[d.id] = month;
    }

    const payment = debtMonths.reduce((sum, d) => sum + d.payment, 0);
    const interest = debtMonths.reduce((sum, d) => sum + d.interest, 0);
    interestTotal += interest;
    paidTotal += payment;
    months.push({
      month,
      debts: debtMonths,
      order,
      budget: available,
      payment,
      unused: available - payment,
      interest,
      closing: debtMonths.reduce((sum, d) => sum + d.closing, 0),
    });
  }

  const paidOff = tracked.every((d) => (balance.get(d.id) ?? 0) === 0);
  return { strategy, extra, months, paidOff, interest: interestTotal, paid: paidTotal, clearedIn };
}

export interface Comparison {
  avalanche: Plan;
  snowball: Plan;
  minimum: Plan;
}

/** All three strategies for the same debts and extra payment. */
export function comparePlans(debts: Debt[], extra: Pence): Comparison {
  return {
    avalanche: simulate(debts, 'avalanche', extra),
    snowball: simulate(debts, 'snowball', extra),
    minimum: simulate(debts, 'minimum', extra),
  };
}
