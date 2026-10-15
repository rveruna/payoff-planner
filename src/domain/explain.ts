import { formatPercent, formatPounds, monthlyInterest, type Pence } from './money';
import type { Debt, Plan } from './types';

export interface DebtStep {
  id: string;
  name: string;
  opening: Pence;
  /** "£2,850.00 × 24.9% ÷ 12 = £59.13 (rounded to the nearest penny)" */
  interestWorking: string;
  interest: Pence;
  minimum: Pence;
  /** Why the minimum is less than usual, or null. */
  minimumNote: string | null;
  extra: Pence;
  /** Why this debt got the extra, or null if it got none. */
  extraReason: string | null;
  payment: Pence;
  closing: Pence;
  cleared: boolean;
}

export interface MonthExplanation {
  month: number;
  budget: Pence;
  /** What the budget is made of, in words. */
  budgetWorking: string;
  /** What was left over because everything was cleared, or 0. */
  unused: Pence;
  steps: DebtStep[];
  /** Debts cleared this month, by name. */
  cleared: string[];
}

function interestWorking(opening: Pence, aprBp: number, interest: Pence): string {
  const exact = (opening * aprBp) % 120_000 === 0;
  const base = `${formatPounds(opening)} × ${formatPercent(aprBp)} ÷ 12 = ${formatPounds(interest)}`;
  return exact ? base : `${base} (rounded to the nearest penny)`;
}

/**
 * Explains one month of a plan in steps a person can check with a calculator. Everything here is read from the plan
 * itself, never worked out a second time, so the explanation cannot disagree with the numbers it explains.
 */
export function explainMonth(plan: Plan, debts: Debt[], monthNumber: number): MonthExplanation | null {
  const row = plan.months[monthNumber - 1];
  if (!row) return null;
  const byId = new Map(debts.map((d) => [d.id, d]));
  const nameOf = (id: string) => byId.get(id)?.name ?? id;
  const rolling = plan.strategy !== 'minimum';

  const steps: DebtStep[] = row.debts.map((d) => {
    const debt = byId.get(d.id)!;
    const accrued = d.opening + d.interest;
    let extraReason: string | null = null;
    if (d.extra > 0) {
      const rank = row.order.indexOf(d.id);
      const ahead = row.order
        .slice(0, rank)
        .filter((id) => (row.debts.find((x) => x.id === id)?.closing ?? 1) === 0);
      const why =
        plan.strategy === 'avalanche'
          ? `the highest interest rate of the debts still open (${formatPercent(debt.aprBp)})`
          : `the smallest balance of the debts still open (${formatPounds(d.opening)})`;
      extraReason =
        ahead.length > 0 && rank > 0
          ? `What was left after ${ahead.map(nameOf).join(' and ')} ${ahead.length === 1 ? 'was' : 'were'} cleared goes next: ${why}`
          : `The extra goes here first: ${why}`;
    }
    return {
      id: d.id,
      name: nameOf(d.id),
      opening: d.opening,
      interestWorking: interestWorking(d.opening, debt.aprBp, d.interest),
      interest: d.interest,
      minimum: d.minimum,
      minimumNote:
        d.minimum < debt.minPayment
          ? `Only ${formatPounds(accrued)} was owed, so that is all that is paid`
          : null,
      extra: d.extra,
      extraReason,
      payment: d.payment,
      closing: d.closing,
      cleared: d.closing === 0,
    };
  });

  let budgetWorking: string;
  if (rolling) {
    const allMinimums = debts.filter((d) => d.balance > 0).reduce((sum, d) => sum + d.minPayment, 0);
    const openMinimums = row.debts.reduce((sum, d) => sum + (byId.get(d.id)?.minPayment ?? 0), 0);
    const rolled = allMinimums - openMinimums;
    budgetWorking =
      `${formatPounds(row.budget)} to spend = ${formatPounds(allMinimums)} of minimums across every debt` +
      ` + ${formatPounds(plan.extra)} extra` +
      (rolled > 0 ? `, of which ${formatPounds(rolled)} has rolled on from debts already cleared` : '');
  } else {
    budgetWorking = `${formatPounds(row.budget)} = the minimum on each debt still open. Nothing rolls on when a debt is cleared, and the extra is not used`;
  }

  return {
    month: row.month,
    budget: row.budget,
    budgetWorking,
    unused: row.unused,
    steps,
    cleared: steps.filter((s) => s.cleared).map((s) => s.name),
  };
}

/** Re-derives a step's interest from its opening balance, so a test can check the working is honest. */
export function checkInterest(step: Pick<DebtStep, 'opening' | 'interest'>, aprBp: number): boolean {
  return monthlyInterest(step.opening, aprBp) === step.interest;
}
