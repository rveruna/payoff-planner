/** Money is held as a whole number of pence, never as a floating point number of pounds. */
export type Pence = number;

/** The largest balance, payment or extra accepted: £10 million, in pence. */
export const MAX_PENCE = 1_000_000_000;

/** The highest interest rate accepted, in basis points: 99.99%. */
export const MAX_APR_BP = 9999;

/**
 * Divides two positive whole numbers and rounds half up to a whole number, using only whole-number arithmetic so the
 * answer never depends on how floating point happens to round.
 */
export function roundDiv(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

/** The interest charged for one month: balance times the yearly rate divided by 12, to the nearest penny, half up. */
export function monthlyInterest(balance: Pence, aprBp: number): Pence {
  return roundDiv(balance * aprBp, 120_000);
}

const grouped = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** "£1,234.56", or "-£1,234.56". */
export function formatPounds(pence: Pence): string {
  const sign = pence < 0 ? '-' : '';
  const abs = Math.abs(pence);
  const pounds = Math.floor(abs / 100);
  const rest = (abs % 100).toString().padStart(2, '0');
  return `${sign}£${grouped(pounds)}.${rest}`;
}

/** "£1,234" when the amount is a whole number of pounds, otherwise with pence. */
export function formatPoundsShort(pence: Pence): string {
  return pence % 100 === 0 ? formatPounds(pence).replace(/\.00$/, '') : formatPounds(pence);
}

/** An interest rate in basis points as a percentage without needless zeros: 2490 is "24.9%", 1000 is "10%". */
export function formatPercent(aprBp: number): string {
  const whole = Math.floor(aprBp / 100);
  const fraction = (aprBp % 100).toString().padStart(2, '0').replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''}%`;
}

const AMOUNT = /^(\d{1,12})(?:\.(\d{1,2}))?$/;

function parseDecimal(text: string): { whole: number; fraction: number } | null {
  const match = AMOUNT.exec(text);
  if (!match) return null;
  return { whole: Number(match[1]), fraction: Number((match[2] ?? '').padEnd(2, '0')) };
}

/** "£1,234.50", "1234.5" or "50" as pence, or null for anything that is not a plain amount of money. */
export function parsePounds(text: string): Pence | null {
  const parsed = parseDecimal(text.trim().replace(/^£/, '').replace(/,/g, '').trim());
  if (!parsed) return null;
  const pence = parsed.whole * 100 + parsed.fraction;
  return pence <= MAX_PENCE ? pence : null;
}

/** "24.9", "24.9%" or "19.99" as basis points, or null for anything that is not a plain percentage. */
export function parsePercent(text: string): number | null {
  const parsed = parseDecimal(text.trim().replace(/%$/, '').trim());
  if (!parsed) return null;
  const bp = parsed.whole * 100 + parsed.fraction;
  return bp <= MAX_APR_BP ? bp : null;
}
