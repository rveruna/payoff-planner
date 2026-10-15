import { BACKGROUND, DEBT_COLORS, STRATEGY_COLORS } from './colors';
import { contrastRatio } from './contrast';
import { MAX_DEBTS } from './scenario';

describe('chart colours on the white background (WCAG graphics, 3:1)', () => {
  it.each(Object.entries(STRATEGY_COLORS))('the %s line colour %s is visible', (_name, colour) => {
    expect(contrastRatio(colour, BACKGROUND)).toBeGreaterThanOrEqual(3);
  });

  it.each([...DEBT_COLORS])('the debt colour %s is visible', (colour) => {
    expect(contrastRatio(colour, BACKGROUND)).toBeGreaterThanOrEqual(3);
  });

  it('has a different colour for every debt that can be added', () => {
    expect(new Set(DEBT_COLORS).size).toBe(DEBT_COLORS.length);
    expect(DEBT_COLORS.length).toBeGreaterThanOrEqual(MAX_DEBTS);
  });

  it('keeps the three strategy colours apart', () => {
    expect(new Set(Object.values(STRATEGY_COLORS)).size).toBe(3);
  });
});
