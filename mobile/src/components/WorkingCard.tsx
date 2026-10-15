import { StyleSheet, Text, View } from 'react-native';
import { explainMonth } from '@domain/explain';
import { formatPounds } from '@domain/money';
import { addMonths, formatMonth, type Month } from '@domain/months';
import type { Debt, Plan } from '@domain/types';
import { Card, Note } from '@/components/ui';
import { colors, font, radius, space } from '@/theme';

/** Every number for one month, with the sum that produced it, so a person can check it with a calculator. */
export function WorkingCard({
  plan,
  debts,
  start,
  month,
}: {
  plan: Plan;
  debts: Debt[];
  start: Month;
  month: number;
}) {
  const explanation = explainMonth(plan, debts, month);
  if (!explanation) return null;

  return (
    <View style={styles.gap}>
      <Note>
        Every figure for month {month} ({formatMonth(addMonths(start, month - 1))}), as worked out by the
        plan. Interest is charged first, then the payments are made.
      </Note>
      <Text style={styles.budget}>{explanation.budgetWorking}</Text>
      {explanation.steps.map((step) => (
        <Card key={step.id} style={[styles.gap, step.cleared && styles.cleared]}>
          <Text accessibilityRole="header" style={styles.title}>
            {step.name}
            {step.cleared ? ' · cleared this month' : ''}
          </Text>
          <Line label="Owed at the start" value={formatPounds(step.opening)} />
          <Line label="Interest added" value={step.interestWorking} />
          <Line
            label="Paid"
            value={`${formatPounds(step.payment)}${step.extra > 0 ? ` = ${formatPounds(step.minimum)} minimum + ${formatPounds(step.extra)} extra` : ' = the minimum'}${step.minimumNote ? `. ${step.minimumNote}` : ''}`}
          />
          {step.extraReason ? <Line label="Why the extra is here" value={step.extraReason} /> : null}
          <Line
            label="Owed at the end"
            value={`${formatPounds(step.opening)} + ${formatPounds(step.interest)} − ${formatPounds(step.payment)} = ${formatPounds(step.closing)}`}
          />
        </Card>
      ))}
      {explanation.unused > 0 && (
        <Note>
          {formatPounds(explanation.unused)} of this month’s budget was not needed, because every debt is now
          paid off.
        </Note>
      )}
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  budget: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    padding: space.sm,
    fontWeight: '600',
    color: colors.text,
    fontSize: font.body,
  },
  cleared: { borderColor: colors.accent, backgroundColor: '#f4fbf7' },
  title: { fontSize: font.body, fontWeight: '700', color: colors.text },
  lineLabel: { fontSize: 12, color: colors.muted },
  lineValue: { fontSize: font.body, color: colors.text, lineHeight: 22 },
});
