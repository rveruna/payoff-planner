import { z } from 'zod';
import { MAX_APR_BP, MAX_PENCE, type Pence } from './money';
import { isMonth, type Month } from './months';
import { STRATEGIES, type Debt, type Strategy } from './types';

export const MAX_DEBTS = 8;
export const MAX_NAME = 30;
export const MAX_EXTRA: Pence = 100_000;

export interface Scenario {
  debts: Debt[];
  extra: Pence;
  strategy: Strategy;
  /** The month the plan starts in, or null for the current month. */
  start: Month | null;
}

/** Made-up debts, in a mix that makes the strategies come out differently. They are not real products or rates. */
export const SAMPLE_DEBTS: Debt[] = [
  { id: 'd0', name: 'Store card', balance: 48_000, aprBp: 2990, minPayment: 2_000 },
  { id: 'd1', name: 'Credit card', balance: 650_000, aprBp: 2490, minPayment: 16_500 },
  { id: 'd2', name: 'Personal loan', balance: 240_000, aprBp: 990, minPayment: 9_500 },
  { id: 'd3', name: 'Car finance', balance: 750_000, aprBp: 690, minPayment: 23_000 },
  { id: 'd4', name: 'Overdraft', balance: 95_000, aprBp: 3990, minPayment: 4_000 },
];

export const DEFAULT_SCENARIO: Scenario = {
  debts: SAMPLE_DEBTS,
  extra: 15_000,
  strategy: 'avalanche',
  start: null,
};

const wholeNumber = (max: number) => z.coerce.number().int().min(0).max(max);

/** One debt as it appears in a link: name~balance~rate~minimum, with the money in pence and the rate in basis points. */
const debtFields = z.object({
  name: z.string(),
  balance: wholeNumber(MAX_PENCE),
  aprBp: wholeNumber(MAX_APR_BP),
  minPayment: wholeNumber(MAX_PENCE),
});

function parseDebtParam(value: string) {
  const parts = value.split('~');
  if (parts.length !== 4) return null;
  const parsed = debtFields.safeParse({
    name: parts[0],
    balance: parts[1],
    aprBp: parts[2],
    minPayment: parts[3],
  });
  return parsed.success ? parsed.data : null;
}

/** What to call a debt: its name, or "Debt 3" if it has none. This is only for showing; the name itself is left as typed. */
export function displayName(debt: { name: string }, index: number): string {
  return debt.name.trim() === '' ? `Debt ${index + 1}` : debt.name;
}

/**
 * Makes a name safe to put in a link: the separator and control characters become spaces and it is cut to length. It is not
 * trimmed, because a name is edited one letter at a time and a space at the end is on the way to the next word.
 */
function cleanName(name: string): string {
  return Array.from(name, (ch) => (ch === '~' || ch.charCodeAt(0) < 32 ? ' ' : ch))
    .join('')
    .slice(0, MAX_NAME);
}

/** Debts from a link, skipping any that are not in the expected shape, up to the limit. */
function parseDebts(values: string[]): Debt[] {
  const debts: Debt[] = [];
  for (const value of values) {
    const parsed = parseDebtParam(value);
    if (!parsed || debts.length >= MAX_DEBTS) continue;
    debts.push({
      id: `d${debts.length}`,
      name: cleanName(parsed.name),
      balance: parsed.balance,
      aprBp: parsed.aprBp,
      minPayment: parsed.minPayment,
    });
  }
  return debts;
}

/** What the user has chosen. Anything missing or not recognised in the link falls back to the default. */
export function parseScenario(search: string): Scenario {
  const params = new URLSearchParams(search);
  const debtValues = params.getAll('d');
  const strategy = z.enum(STRATEGIES as [Strategy, ...Strategy[]]).safeParse(params.get('s'));
  const extra = wholeNumber(MAX_EXTRA).safeParse(params.get('x'));
  const from = params.get('from');
  return {
    debts: debtValues.length > 0 ? parseDebts(debtValues) : DEFAULT_SCENARIO.debts,
    extra: extra.success && params.has('x') ? extra.data : DEFAULT_SCENARIO.extra,
    strategy: strategy.success ? strategy.data : DEFAULT_SCENARIO.strategy,
    start: from !== null && isMonth(from) ? from : null,
  };
}

const sameDebts = (a: Debt[], b: Debt[]) =>
  a.length === b.length &&
  a.every(
    (d, i) =>
      d.name === b[i]!.name &&
      d.balance === b[i]!.balance &&
      d.aprBp === b[i]!.aprBp &&
      d.minPayment === b[i]!.minPayment,
  );

/** Writes only what differs from the defaults, so a shared link stays short. */
export function scenarioToSearch(scenario: Scenario): string {
  const params = new URLSearchParams();
  if (!sameDebts(scenario.debts, DEFAULT_SCENARIO.debts)) {
    if (scenario.debts.length === 0) params.append('d', '');
    for (const d of scenario.debts)
      params.append('d', [cleanName(d.name), d.balance, d.aprBp, d.minPayment].join('~'));
  }
  if (scenario.extra !== DEFAULT_SCENARIO.extra) params.set('x', String(scenario.extra));
  if (scenario.strategy !== DEFAULT_SCENARIO.strategy) params.set('s', scenario.strategy);
  if (scenario.start) params.set('from', scenario.start);
  const text = params.toString();
  return text ? `?${text}` : '';
}
