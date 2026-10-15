import fc from 'fast-check';
import { simulate } from './engine';
import {
  DEFAULT_SCENARIO,
  MAX_DEBTS,
  MAX_NAME,
  SAMPLE_DEBTS,
  displayName,
  parseScenario,
  scenarioToSearch,
  type Scenario,
} from './scenario';

describe('the sample scenario', () => {
  it('is paid off by every strategy, with minimums that cover the interest', () => {
    for (const strategy of ['avalanche', 'snowball', 'minimum'] as const) {
      expect(simulate(SAMPLE_DEBTS, strategy, DEFAULT_SCENARIO.extra).paidOff).toBe(true);
    }
  });

  it('makes the strategies come out differently, so the comparison means something', () => {
    const av = simulate(SAMPLE_DEBTS, 'avalanche', DEFAULT_SCENARIO.extra);
    const sn = simulate(SAMPLE_DEBTS, 'snowball', DEFAULT_SCENARIO.extra);
    const mn = simulate(SAMPLE_DEBTS, 'minimum', DEFAULT_SCENARIO.extra);

    expect(sn.interest - av.interest).toBeGreaterThan(50_000);
    expect(mn.interest - av.interest).toBeGreaterThan(300_000);
    expect(mn.months.length).toBeGreaterThan(av.months.length + 24);
  });

  it('is made of invented debts with distinct names', () => {
    expect(new Set(SAMPLE_DEBTS.map((d) => d.name)).size).toBe(SAMPLE_DEBTS.length);
  });
});

describe('parseScenario', () => {
  it('uses the sample scenario when the link says nothing', () => {
    expect(parseScenario('')).toEqual(DEFAULT_SCENARIO);
  });

  it('reads the debts, the extra, the strategy and the start month', () => {
    const scenario = parseScenario(
      '?d=Card~100000~2400~5000&d=Loan~250000~800~9000&x=3000&s=snowball&from=2027-03',
    );

    expect(scenario).toEqual({
      debts: [
        { id: 'd0', name: 'Card', balance: 100_000, aprBp: 2400, minPayment: 5_000 },
        { id: 'd1', name: 'Loan', balance: 250_000, aprBp: 800, minPayment: 9_000 },
      ],
      extra: 3_000,
      strategy: 'snowball',
      start: '2027-03',
    });
  });

  it('can be empty of debts', () => {
    expect(parseScenario('?d=').debts).toEqual([]);
  });

  it.each([
    ['a debt with too few parts', '?d=Card~100000~2400'],
    ['a debt with too many parts', '?d=Card~1~2~3~4'],
    ['a balance that is not a number', '?d=Card~lots~2400~5000'],
    ['a rate above the maximum', '?d=Card~100000~10000~5000'],
    ['a negative amount', '?d=Card~-5~2400~5000'],
    ['a balance above the maximum', '?d=Card~99999999999~2400~5000'],
  ])('skips %s and keeps the valid ones', (_name, bad) => {
    const scenario = parseScenario(`${bad}&d=Good~100000~2400~5000`);
    expect(scenario.debts.map((d) => d.name)).toEqual(['Good']);
  });

  it.each([
    ['an unknown strategy', '?s=gamble', 'strategy', 'avalanche'],
    ['an extra above the maximum', '?x=99999999', 'extra', DEFAULT_SCENARIO.extra],
    ['an extra that is not a number', '?x=lots', 'extra', DEFAULT_SCENARIO.extra],
    ['a start that is not a month', '?from=soon', 'start', null],
    ['a start in the wrong form', '?from=2027-13', 'start', null],
  ] as const)('falls back for %s', (_name, search, key, expected) => {
    expect(parseScenario(search)[key]).toBe(expected);
  });

  it('accepts an extra of zero', () => {
    expect(parseScenario('?x=0').extra).toBe(0);
  });

  it(`keeps at most ${MAX_DEBTS} debts`, () => {
    const many = Array.from({ length: 12 }, (_, i) => `d=Debt${i}~100000~2400~5000`).join('&');
    expect(parseScenario(`?${many}`).debts).toHaveLength(MAX_DEBTS);
  });

  it('keeps spaces at the end of a name, so a name can be typed one letter at a time', () => {
    expect(parseScenario('?d=Bank%20~1~1~1').debts[0]!.name).toBe('Bank ');
    const written = scenarioToSearch({
      ...DEFAULT_SCENARIO,
      debts: [{ id: 'd0', name: 'Bank ', balance: 1, aprBp: 1, minPayment: 1 }],
    });
    expect(parseScenario(written).debts[0]!.name).toBe('Bank ');
  });

  it('shortens long names and removes the separator and control characters', () => {
    const long = 'x'.repeat(100);
    const scenario = parseScenario(`?d=${long}~1~1~1&d=a~b~1~1~1&d=A%01B~1~1~1`);

    expect(scenario.debts[0]!.name).toHaveLength(MAX_NAME);
    expect(scenario.debts.map((d) => d.name).slice(1)).toEqual(['A B']);
  });

  it('keeps an empty name as it is, so clearing a name field to type a new one does not put something back', () => {
    expect(parseScenario('?d=~1~1~1').debts[0]!.name).toBe('');
    expect(parseScenario('?d=%20%20~1~1~1').debts[0]!.name).toBe('  ');
  });

  it('treats a name that looks like markup as plain text', () => {
    const scenario = parseScenario('?d=%3Cscript%3Ealert(1)%3C%2Fscript%3E~100000~2400~5000');
    expect(scenario.debts[0]!.name).toBe('<script>alert(1)</script>');
  });
});

describe('scenarioToSearch', () => {
  it('writes nothing for the default scenario', () => {
    expect(scenarioToSearch(DEFAULT_SCENARIO)).toBe('');
  });

  it('writes only what differs', () => {
    expect(scenarioToSearch({ ...DEFAULT_SCENARIO, extra: 5_000, strategy: 'snowball' })).toBe(
      '?x=5000&s=snowball',
    );
  });

  it('writes the debts when they differ from the sample, and an empty list as an empty value', () => {
    expect(scenarioToSearch({ ...DEFAULT_SCENARIO, debts: [] })).toBe('?d=');
    const one: Scenario = {
      ...DEFAULT_SCENARIO,
      debts: [{ id: 'd0', name: 'Card', balance: 100_000, aprBp: 2400, minPayment: 5_000 }],
    };
    expect(decodeURIComponent(scenarioToSearch(one))).toBe('?d=Card~100000~2400~5000');
  });

  it('round-trips any scenario', () => {
    const debtArb = fc.record({
      name: fc
        .string({ minLength: 1, maxLength: MAX_NAME })
        .filter(
          (n) =>
            n.trim() === n &&
            n.length > 0 &&
            !Array.from(n).some((ch) => ch === '~' || ch.charCodeAt(0) < 32),
        ),
      balance: fc.integer({ min: 1, max: 1_000_000_000 }),
      aprBp: fc.integer({ min: 0, max: 9999 }),
      minPayment: fc.integer({ min: 0, max: 1_000_000_000 }),
    });
    fc.assert(
      fc.property(
        fc.array(debtArb, { maxLength: MAX_DEBTS }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.constantFrom('avalanche', 'snowball', 'minimum' as const),
        fc.option(fc.constantFrom('2026-11', '2030-01', '2041-12'), { nil: null }),
        (list, extra, strategy, start) => {
          const scenario: Scenario = {
            debts: list.map((d, i) => ({ ...d, id: `d${i}` })),
            extra,
            strategy,
            start,
          };
          expect(parseScenario(scenarioToSearch(scenario))).toEqual(scenario);
        },
      ),
    );
  });
});

describe('displayName', () => {
  it('is the name, or a numbered fallback when there is none', () => {
    expect(displayName({ name: 'Card' }, 0)).toBe('Card');
    expect(displayName({ name: '' }, 1)).toBe('Debt 2');
    expect(displayName({ name: '   ' }, 2)).toBe('Debt 3');
  });
});
