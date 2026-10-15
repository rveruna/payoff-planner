import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STRATEGY_COLORS, STRATEGY_NAMES } from '@domain/colors';
import type { Comparison } from '@domain/engine';
import { formatPounds } from '@domain/money';
import { addMonths, formatDuration, formatMonth, type Month } from '@domain/months';
import { MAX_EXTRA } from '@domain/scenario';
import { STRATEGIES, type Strategy } from '@domain/types';
import { Button, Card, Note } from '@/components/ui';
import { colors, font, MIN_TARGET, radius, space } from '@/theme';

const STEP = 1_000;

/** The answer: when the debts are cleared and what it costs, and what that saves against paying only the minimums. */
export function Headline({
  strategy,
  comparison,
  start,
}: {
  strategy: Strategy;
  comparison: Comparison;
  start: Month;
}) {
  const plan = comparison[strategy];
  const minimum = comparison.minimum;

  if (plan.months.length === 0) {
    return (
      <Card>
        <Text style={styles.big} accessibilityLiveRegion="polite">
          There are no debts to pay off.
        </Text>
      </Card>
    );
  }
  if (!plan.paidOff) {
    return (
      <Card style={styles.warn}>
        <Text style={styles.big} accessibilityLiveRegion="polite">
          These payments never clear the debts
        </Text>
        <Text style={styles.body}>
          With {STRATEGY_NAMES[strategy].toLowerCase()} the balance is still not paid off after 50 years.
          Raise the extra payment, or check that every minimum is more than a month&rsquo;s interest.
        </Text>
      </Card>
    );
  }

  const done = formatMonth(addMonths(start, plan.months.length - 1));
  const savedInterest = minimum.paidOff ? minimum.interest - plan.interest : null;
  const savedMonths = minimum.paidOff ? minimum.months.length - plan.months.length : null;

  return (
    <Card style={styles.headline}>
      <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`Debt-free in ${done}`}>
        <Text style={styles.small}>Debt-free in</Text>
        <Text style={styles.big}>{done}</Text>
      </View>
      <Text style={styles.body}>
        after {formatDuration(plan.months.length)} of payments, with{' '}
        <Text style={styles.bold}>{formatPounds(plan.interest)}</Text> paid in interest.
      </Text>
      {strategy !== 'minimum' && (
        <Text style={styles.saving}>
          {savedInterest !== null && savedMonths !== null
            ? `That is ${formatPounds(savedInterest)} less interest and ${formatDuration(savedMonths)} sooner than paying only the minimums.`
            : 'Paying only the minimums would never clear these debts.'}
        </Text>
      )}
    </Card>
  );
}

/** The extra paid each month, changed in steps of £10 with two big buttons, which suits a thumb better than a slider. */
export function ExtraStepper({ value, onChange }: { value: number; onChange: (pence: number) => void }) {
  return (
    <Card>
      <Text style={styles.label}>Extra to pay each month, on top of the minimums</Text>
      <View style={styles.stepper}>
        <Button
          label="−"
          accessibilityLabel="Decrease the extra by £10"
          variant="secondary"
          onPress={() => onChange(Math.max(0, value - STEP))}
          disabled={value <= 0}
          testID="extra-down"
        />
        <Text
          style={styles.extra}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Extra ${formatPounds(value)} a month`}
          testID="extra-value"
        >
          {formatPounds(value)}
        </Text>
        <Button
          label="+"
          accessibilityLabel="Increase the extra by £10"
          variant="secondary"
          onPress={() => onChange(Math.min(MAX_EXTRA, value + STEP))}
          disabled={value >= MAX_EXTRA}
          testID="extra-up"
        />
      </View>
      <Note>Every result updates at once.</Note>
    </Card>
  );
}

const DESCRIPTIONS: Record<Strategy, string> = {
  avalanche: 'The extra goes to the highest rate first. It costs the least interest.',
  snowball: 'The extra goes to the smallest balance first.',
  minimum: 'Only the minimums. Nothing rolls on, and your extra is not used.',
};

/** The three ways of paying, as a group of radio buttons, each with what it would mean for the debts. */
export function StrategyPicker({
  value,
  comparison,
  start,
  onChange,
}: {
  value: Strategy;
  comparison: Comparison;
  start: Month;
  onChange: (s: Strategy) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="How to pay them off" style={styles.group}>
      <Text style={styles.label}>How to pay them off</Text>
      {STRATEGIES.map((strategy) => {
        const plan = comparison[strategy];
        const selected = strategy === value;
        const outcome =
          plan.months.length === 0
            ? 'Nothing to pay'
            : plan.paidOff
              ? `${formatMonth(addMonths(start, plan.months.length - 1))}, ${formatPounds(plan.interest)} interest`
              : 'Never clears the debts';
        return (
          <Pressable
            key={strategy}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            // react-native-web leaves the attribute off when it is false, and a radio must always have one
            aria-checked={selected}
            accessibilityLabel={`${STRATEGY_NAMES[strategy]}. ${DESCRIPTIONS[strategy]} ${outcome}`}
            onPress={() => onChange(strategy)}
            style={[
              styles.option,
              { borderLeftColor: STRATEGY_COLORS[strategy] },
              selected && styles.optionSelected,
            ]}
            testID={`strategy-${strategy}`}
          >
            <Text style={styles.optionTitle}>
              {STRATEGY_NAMES[strategy]}
              {selected ? ' · chosen' : ''}
            </Text>
            <Text style={styles.note}>{DESCRIPTIONS[strategy]}</Text>
            <Text style={styles.outcome}>{outcome}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { gap: space.xs },
  warn: { backgroundColor: colors.warn, gap: space.sm },
  small: { fontSize: font.body, fontWeight: '600', color: colors.muted },
  big: { fontSize: font.big, fontWeight: '800', color: colors.text, lineHeight: 38 },
  body: { fontSize: font.body, color: colors.text, lineHeight: 22 },
  bold: { fontWeight: '800' },
  saving: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    padding: space.sm,
    fontWeight: '600',
    color: colors.text,
    marginTop: space.xs,
  },
  label: { fontSize: font.body, fontWeight: '700', color: colors.text, marginBottom: space.sm },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.sm,
  },
  extra: {
    fontSize: font.title,
    fontWeight: '800',
    color: colors.accent,
    minWidth: 110,
    textAlign: 'center',
  },
  group: { gap: space.sm },
  option: {
    minHeight: MIN_TARGET,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 6,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  optionSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  optionTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  note: { fontSize: font.small, color: colors.muted, lineHeight: 19 },
  outcome: { fontSize: font.small, fontWeight: '700', color: colors.text },
});
