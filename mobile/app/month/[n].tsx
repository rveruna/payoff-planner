import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { addMonths, formatMonth } from '@domain/months';
import { WorkingCard } from '@/components/WorkingCard';
import { Button, Heading, Note, Screen } from '@/components/ui';
import { usePlan } from '@/lib/usePlan';
import { space } from '@/theme';
import { leave } from '@/lib/leave';

export default function MonthScreen() {
  const { n } = useLocalSearchParams<{ n: string }>();
  const router = useRouter();
  const { plan, debts, start } = usePlan();
  const last = plan.months.length;
  const month = Math.round(Number(n));

  if (!Number.isInteger(month) || month < 1 || month > last) {
    return (
      <Screen style={styles.pad}>
        <Stack.Screen options={{ title: 'Month' }} />
        <Heading>That month is not in the plan</Heading>
        <Note>The plan changes when the debts or the extra payment do.</Note>
        <Button label="Go back" variant="secondary" onPress={() => leave(router)} />
      </Screen>
    );
  }

  const go = (next: number) => router.setParams({ n: String(next) });

  return (
    <Screen>
      <Stack.Screen options={{ title: `Month ${month} · ${formatMonth(addMonths(start, month - 1))}` }} />
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button
              label="Earlier"
              variant="secondary"
              onPress={() => go(month - 1)}
              disabled={month <= 1}
              accessibilityLabel="Previous month"
              testID="prev"
            />
          </View>
          <View style={styles.flex}>
            <Button
              label="Later"
              variant="secondary"
              onPress={() => go(month + 1)}
              disabled={month >= last}
              accessibilityLabel="Next month"
              testID="next"
            />
          </View>
        </View>
        <WorkingCard plan={plan} debts={debts} start={start} month={month} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
