import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { formatPounds } from '@domain/money';
import { parseScenario } from '@domain/scenario';
import { STRATEGY_NAMES } from '@domain/colors';
import { Button, Card, Heading, Note, Screen } from '@/components/ui';
import { useScenarioStore } from '@/store/scenarioStore';
import { space } from '@/theme';
import { leave } from '@/lib/leave';

/**
 * Opens when a plan link is tapped, either this app's own link (payoff://import?...) or one shared from the web version.
 * The link is read as untrusted input and shown for confirmation before anything is replaced.
 */
export default function ImportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value]) if (typeof v === 'string') search.append(key, v);
  }
  const text = search.toString();
  const scenario = parseScenario(text ? `?${text}` : '');
  // a link with no plan in it, or with debts that cannot be read at all, must not be offered as a way to wipe the debts
  const hadDebts = search.getAll('d').some((value) => value !== '');
  const empty = !text || (hadDebts && scenario.debts.length === 0);

  if (empty) {
    return (
      <Screen style={styles.pad}>
        <Heading>Nothing to import</Heading>
        <Note>This link does not contain a plan that can be read.</Note>
        <Button label="Close" variant="secondary" onPress={() => leave(router)} />
      </Screen>
    );
  }

  const total = scenario.debts.reduce((sum, d) => sum + d.balance, 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        <Heading>Use this plan?</Heading>
        <Card style={styles.gap}>
          <Note>
            {scenario.debts.length} {scenario.debts.length === 1 ? 'debt' : 'debts'} totalling{' '}
            {formatPounds(total)}, with {formatPounds(scenario.extra)} extra a month, paid with{' '}
            {STRATEGY_NAMES[scenario.strategy].toLowerCase()}.
          </Note>
          {scenario.debts.map((d) => (
            <Note key={d.id}>
              {d.name || 'Unnamed'}: {formatPounds(d.balance)}
            </Note>
          ))}
        </Card>
        <Note>Using it replaces the debts you have now. This cannot be undone.</Note>
        <Button
          label="Replace my debts with this plan"
          onPress={() => {
            useScenarioStore
              .getState()
              .replaceScenario({ debts: scenario.debts, extra: scenario.extra, strategy: scenario.strategy });
            router.replace('/plan');
          }}
          testID="confirm-import"
        />
        <Button label="Cancel" variant="secondary" onPress={() => leave(router)} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: space.lg, gap: space.md },
  gap: { gap: space.xs },
});
