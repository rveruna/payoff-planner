import fc from 'fast-check';
import {
  MAX_APR_BP,
  MAX_PENCE,
  formatPercent,
  formatPounds,
  formatPoundsShort,
  monthlyInterest,
  parsePercent,
  parsePounds,
  roundDiv,
} from './money';

describe('roundDiv', () => {
  it.each([
    [1, 2, 1],
    [1, 3, 0],
    [2, 3, 1],
    [5, 10, 1],
    [4, 10, 0],
    [0, 7, 0],
    [7, 7, 1],
    [149, 100, 1],
    [150, 100, 2],
  ])('%s / %s rounds to %s, with halves going up', (n, d, expected) => {
    expect(roundDiv(n, d)).toBe(expected);
  });

  it('agrees with exact arithmetic for any whole numbers', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1e12 }), fc.integer({ min: 1, max: 1e6 }), (n, d) => {
        const result = roundDiv(n, d);
        // within half a unit of the exact quotient, in whole-number terms: |n - result*d| * 2 <= d
        expect(Math.abs(n - result * d) * 2).toBeLessThanOrEqual(d);
        // and a half always rounds up
        if ((2 * n) % (2 * d) === d) expect(result * d).toBeGreaterThan(n);
      }),
    );
  });
});

describe('monthlyInterest', () => {
  it('is a twelfth of the yearly rate on the balance, to the nearest penny', () => {
    // £1,000.00 at 12% a year is 1% a month: £10.00
    expect(monthlyInterest(100_000, 1200)).toBe(1000);
    // £2,400.00 at 24.9%: 240000 * 2490 / 120000 = 4980 pence
    expect(monthlyInterest(240_000, 2490)).toBe(4980);
  });

  it('rounds half a penny up', () => {
    // 50 pence at 12%: 0.5 pence
    expect(monthlyInterest(50, 1200)).toBe(1);
    // 49 pence at 12%: 0.49 pence
    expect(monthlyInterest(49, 1200)).toBe(0);
  });

  it('is zero with no balance or no rate', () => {
    expect(monthlyInterest(0, 2490)).toBe(0);
    expect(monthlyInterest(100_000, 0)).toBe(0);
  });

  it('is within half a penny of the exact figure, and never negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_PENCE }),
        fc.integer({ min: 0, max: MAX_APR_BP }),
        (balance, apr) => {
          const interest = monthlyInterest(balance, apr);
          expect(Number.isInteger(interest)).toBe(true);
          expect(interest).toBeGreaterThanOrEqual(0);
          expect(Math.abs(interest - (balance * apr) / 120_000)).toBeLessThanOrEqual(0.5);
        },
      ),
    );
  });
});

describe('formatPounds', () => {
  it.each([
    [0, '£0.00'],
    [5, '£0.05'],
    [100, '£1.00'],
    [123456, '£1,234.56'],
    [100000000, '£1,000,000.00'],
    [-4050, '-£40.50'],
    [99, '£0.99'],
  ])('%s pence is %s', (pence, text) => {
    expect(formatPounds(pence)).toBe(text);
  });

  it('drops the pence for a whole number of pounds in the short form', () => {
    expect(formatPoundsShort(150000)).toBe('£1,500');
    expect(formatPoundsShort(150050)).toBe('£1,500.50');
  });
});

describe('formatPercent', () => {
  it.each([
    [2490, '24.9%'],
    [1000, '10%'],
    [1999, '19.99%'],
    [5, '0.05%'],
    [0, '0%'],
    [9999, '99.99%'],
    [1050, '10.5%'],
  ])('%s basis points is %s', (bp, text) => {
    expect(formatPercent(bp)).toBe(text);
  });
});

describe('parsePounds', () => {
  it.each([
    ['1234.5', 123450],
    ['£1,234.50', 123450],
    ['  50  ', 5000],
    ['0', 0],
    ['0.01', 1],
    ['£ 20', 2000],
    ['1,000,000', 100_000_000],
    ['10000000', MAX_PENCE],
  ])('reads %j as %s pence', (text, pence) => {
    expect(parsePounds(text)).toBe(pence);
  });

  it.each([
    '',
    'abc',
    '-5',
    '1.234',
    '1..2',
    '£',
    '12 34',
    '1e3',
    '10000000.01',
    '99999999999999',
    '5%',
    '.5',
    '5.',
  ])('refuses %j', (text) => {
    expect(parsePounds(text)).toBeNull();
  });

  it('round-trips with formatPounds for any amount', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAX_PENCE }), (pence) => {
        expect(parsePounds(formatPounds(pence))).toBe(pence);
      }),
    );
  });
});

describe('parsePercent', () => {
  it.each([
    ['24.9', 2490],
    ['24.9%', 2490],
    ['19.99', 1999],
    ['0', 0],
    ['99.99', 9999],
    [' 5 % ', 500],
  ])('reads %j as %s basis points', (text, bp) => {
    expect(parsePercent(text)).toBe(bp);
  });

  it.each(['', 'x', '-1', '100', '100.00', '5.123', '1,5', '%'])('refuses %j', (text) => {
    expect(parsePercent(text)).toBeNull();
  });

  it('round-trips with formatPercent for any rate', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAX_APR_BP }), (bp) => {
        expect(parsePercent(formatPercent(bp))).toBe(bp);
      }),
    );
  });
});
