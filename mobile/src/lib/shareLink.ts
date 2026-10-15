import { scenarioToSearch } from '@domain/scenario';
import type { Pence } from '@domain/money';
import type { Debt, Strategy } from '@domain/types';

/** The web version of the planner, which reads the same link format as this app. */
export const WEB_URL = 'https://rveruna.github.io/payoff-planner/';

interface Plan {
  debts: Debt[];
  extra: Pence;
  strategy: Strategy;
}

/** A link that opens this plan in the web version. It works anywhere, with no app installed. */
export function webLink(plan: Plan): string {
  return `${WEB_URL}${scenarioToSearch({ ...plan, start: null })}`;
}

/** A link that opens this plan in the app, if it is installed. */
export function appLink(plan: Plan): string {
  return `payoff://import${scenarioToSearch({ ...plan, start: null })}`;
}
