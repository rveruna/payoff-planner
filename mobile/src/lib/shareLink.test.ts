import { DEFAULT_SCENARIO, parseScenario } from '@domain/scenario';
import type { Debt } from '@domain/types';
import { WEB_URL, appLink, webLink } from './shareLink';

const plan = {
  debts: DEFAULT_SCENARIO.debts,
  extra: DEFAULT_SCENARIO.extra,
  strategy: DEFAULT_SCENARIO.strategy,
} as const;
const custom = {
  debts: [{ id: 'x', name: 'Bank, loan & more', balance: 123_456, aprBp: 1999, minPayment: 7_500 }] as Debt[],
  extra: 4_000,
  strategy: 'snowball',
} as const;

describe('webLink', () => {
  it('is the web version’s address, and nothing more, for the sample plan', () => {
    expect(webLink(plan)).toBe(WEB_URL);
  });

  it('opens the web version with the same plan, and the web version reads it as this app does', () => {
    const link = new URL(webLink(custom));

    expect(`${link.origin}${link.pathname}`).toBe(WEB_URL);
    const read = parseScenario(link.search);
    expect(read.debts[0]).toMatchObject({
      name: 'Bank, loan & more',
      balance: 123_456,
      aprBp: 1999,
      minPayment: 7_500,
    });
    expect([read.extra, read.strategy]).toEqual([4_000, 'snowball']);
  });

  it('never includes a start month, so the plan always starts from today', () => {
    expect(webLink(custom)).not.toContain('from=');
  });
});

describe('appLink', () => {
  it('uses the app’s own scheme and the same text', () => {
    const link = appLink(custom);

    expect(link.startsWith('payoff://import?')).toBe(true);
    expect(link.slice('payoff://import'.length)).toBe(new URL(webLink(custom)).search);
  });

  it('is just the import address for the sample plan', () => {
    expect(appLink(plan)).toBe('payoff://import');
  });
});
