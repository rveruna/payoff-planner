import type { Pence } from './money';
import type { Strategy } from './types';

export interface Candidate {
  id: string;
  aprBp: number;
  balance: Pence;
}

/**
 * The order the extra money is offered to the debts that are still open.
 * - avalanche: highest interest rate first, then the smaller balance
 * - snowball: smallest balance first, then the higher interest rate
 * Either way, a tie is settled by id so the answer never depends on the order the debts were typed in.
 */
export function priorityOrder(strategy: Exclude<Strategy, 'minimum'>, open: Candidate[]): string[] {
  const byAvalanche = (a: Candidate, b: Candidate) =>
    b.aprBp - a.aprBp || a.balance - b.balance || a.id.localeCompare(b.id);
  const bySnowball = (a: Candidate, b: Candidate) =>
    a.balance - b.balance || b.aprBp - a.aprBp || a.id.localeCompare(b.id);
  return [...open].sort(strategy === 'avalanche' ? byAvalanche : bySnowball).map((c) => c.id);
}
