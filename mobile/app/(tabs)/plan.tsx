import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatMonth, addMonths } from '@domain/months';
import { RaceChart, StackChart } from '@/components/charts';
import { ExtraStepper, Headline, StrategyPicker } from '@/components/PlanParts';
import { Button, Card, Heading, Note, Screen } from '@/components/ui';
import { usePlan } from '@/lib/usePlan';
import { useScenarioStore } from '@/store/scenarioStore';
import { colors, font, space } from '@/theme';

/** How long each month is shown while a plan plays. */
const PLAY_MS = 140;

export default function PlanScreen() {
  const router = useRouter();
  const { debts, extra, strategy, comparison, plan, startingTotal, start } = usePlan();
  const { setExtra, setStrategy } = useScenarioStore.getState();
  const last = plan.months.length;

  const [chosen, setChosen] = useState(1);
  const [playing, setPlaying] = useState(false);
  const month = last === 0 ? 0 : Math.min(Math.max(chosen, 1), last);
  const running = playing && month < last;

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => {
      setChosen(month + 1);
      if (month + 1 >= last) setPlaying(false);
    }, PLAY_MS);
    return () => clearTimeout(id);
  }, [running, month, last]);

  const choose = (m: number) => {
    setPlaying(false);
    setChosen(Math.min(Math.max(m, 1), Math.max(last, 1)));
  };
  const toggle = () => {
    if (running) return setPlaying(false);
    if (month >= last) setChosen(1);
    setPlaying(true);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Headline strategy={strategy} comparison={comparison} start={start} />
        <ExtraStepper value={extra} onChange={setExtra} />
        <StrategyPicker value={strategy} comparison={comparison} start={start} onChange={setStrategy} />

        {last > 0 && (
          <>
            <Card style={styles.gap}>
              <Text style={styles.label} accessibilityLiveRegion="polite" testID="month-label">
                Month {month} · {formatMonth(addMonths(start, month - 1))}
              </Text>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Button
                    label="Earlier"
                    variant="secondary"
                    onPress={() => choose(month - 1)}
                    disabled={month <= 1}
                    accessibilityLabel="Previous month"
                    testID="month-prev"
                  />
                </View>
                <View style={styles.flex}>
                  <Button
                    label={running ? 'Pause' : month >= last ? 'Play again' : 'Play'}
                    onPress={toggle}
                    testID="play"
                  />
                </View>
                <View style={styles.flex}>
                  <Button
                    label="Later"
                    variant="secondary"
                    onPress={() => choose(month + 1)}
                    disabled={month >= last}
                    accessibilityLabel="Next month"
                    testID="month-next"
                  />
                </View>
              </View>
              <Note>
                Drag across a chart, or use the buttons, to look at a month. Play runs the plan month by
                month.
              </Note>
            </Card>

            <Card>
              <Heading>The race</Heading>
              <Note style={styles.noteGap}>Total still owed over time, for each way of paying.</Note>
              <RaceChart
                comparison={comparison}
                startingTotal={startingTotal}
                start={start}
                month={month}
                lastMonth={last}
                onMonth={choose}
              />
            </Card>

            <Card>
              <Heading>Debt by debt</Heading>
              <Note style={styles.noteGap}>
                What is owed on each debt. Debts drop away from the top as they are cleared.
              </Note>
              <StackChart
                debts={debts}
                plan={plan}
                startingTotal={startingTotal}
                start={start}
                month={month}
                onMonth={choose}
              />
            </Card>

            <Button
              label={`Show your working for month ${month}`}
              onPress={() => router.push({ pathname: '/month/[n]', params: { n: String(month) } })}
              testID="open-working"
            />
            <Button
              label="See every month"
              variant="secondary"
              onPress={() => router.push('/schedule')}
              testID="open-schedule"
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md },
  gap: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  label: { fontSize: font.body, fontWeight: '700', color: colors.accent },
  noteGap: { marginBottom: space.sm },
});
