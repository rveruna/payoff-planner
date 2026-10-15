import type { Strategy } from './types';

/** The page and chart background. Every colour below is checked against it in colors.test.ts. */
export const BACKGROUND = '#ffffff';

export const STRATEGY_COLORS: Record<Strategy, string> = {
  avalanche: '#17805a',
  snowball: '#2b5fb0',
  minimum: '#b3261e',
};

/** One colour for each debt, for as many debts as can be added. */
export const DEBT_COLORS = [
  '#17805a',
  '#2b5fb0',
  '#b45309',
  '#9b3d8f',
  '#0e7490',
  '#b3261e',
  '#5b6770',
  '#6d5bd0',
] as const;

export const STRATEGY_NAMES: Record<Strategy, string> = {
  avalanche: 'Avalanche',
  snowball: 'Snowball',
  minimum: 'Minimum payments only',
};
