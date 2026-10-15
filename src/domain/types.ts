import type { Pence } from './money';

export interface Debt {
  id: string;
  name: string;
  /** What is owed now. */
  balance: Pence;
  /** The yearly interest rate in basis points: 2490 is 24.9%. */
  aprBp: number;
  /** The least that must be paid each month. */
  minPayment: Pence;
}

/**
 * - avalanche: the extra goes to the debt with the highest interest rate first
 * - snowball: the extra goes to the smallest balance first
 * - minimum: only the minimums are paid, and nothing is rolled on when a debt is cleared
 */
export type Strategy = 'avalanche' | 'snowball' | 'minimum';

export const STRATEGIES: Strategy[] = ['avalanche', 'snowball', 'minimum'];

/** What happened to one debt in one month. */
export interface DebtMonth {
  id: string;
  opening: Pence;
  interest: Pence;
  /** The part of the payment that is the minimum. */
  minimum: Pence;
  /** The part of the payment that is the extra. */
  extra: Pence;
  payment: Pence;
  closing: Pence;
}

export interface MonthRow {
  /** 1 for the first month. */
  month: number;
  /** Only the debts that still had a balance at the start of the month. */
  debts: DebtMonth[];
  /** The debts in the order the extra is offered to them this month. Empty for the minimum plan. */
  order: string[];
  /** What was available to pay this month. */
  budget: Pence;
  /** What was actually paid. Less than the budget in the last month, when there is nothing left to pay. */
  payment: Pence;
  /** What was left over because every debt was cleared. */
  unused: Pence;
  interest: Pence;
  /** The total still owed at the end of the month. */
  closing: Pence;
}

export interface Plan {
  strategy: Strategy;
  /** The extra paid each month on top of the minimums. The minimum plan does not use it. */
  extra: Pence;
  months: MonthRow[];
  /** False if the debts are still not cleared after the longest period tried. */
  paidOff: boolean;
  /** Total interest paid or charged over the plan. */
  interest: Pence;
  /** Total paid over the plan. */
  paid: Pence;
  /** The month number in which each debt is cleared, or null if it never is. */
  clearedIn: Record<string, number | null>;
}
