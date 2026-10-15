import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPercent, formatPounds, monthlyInterest } from '@domain/money';
import { MAX_DEBTS } from '@domain/scenario';
import { Button, Card, Heading, Note, Screen } from '@/components/ui';
import { usePlan } from '@/lib/usePlan';
import { colors, font, space } from '@/theme';

export default function DebtsScreen() {
  const router = useRouter();
  const { debts, startingTotal } = usePlan();

  return (
    <Screen>
      <FlatList
        data={debts}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Heading>
              {debts.length === 0 ? 'No debts yet' : `You owe ${formatPounds(startingTotal)}`}
            </Heading>
            <Note>
              {debts.length === 0
                ? 'Add a debt to see how to pay it off.'
                : 'These are invented sample debts until you change them. Tap one to edit it.'}
            </Note>
          </View>
        }
        renderItem={({ item }) => {
          const interest = monthlyInterest(item.balance, item.aprBp);
          const stuck = item.balance > 0 && item.minPayment <= interest;
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/debt/[id]', params: { id: item.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, owes ${formatPounds(item.balance)} at ${formatPercent(item.aprBp)}, minimum ${formatPounds(item.minPayment)} a month`}
              accessibilityHint="Opens the debt to edit it"
              testID={`debt-${item.id}`}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.amount}>{formatPounds(item.balance)}</Text>
                </View>
                <Text style={styles.detail}>
                  {formatPercent(item.aprBp)} APR · minimum {formatPounds(item.minPayment)} a month
                </Text>
                {stuck && (
                  <Text style={styles.warning}>
                    The minimum is not more than a month&rsquo;s interest ({formatPounds(interest)}), so
                    paying only that, this debt would not shrink.
                  </Text>
                )}
              </Card>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListFooterComponent={
          <View style={styles.footer}>
            <Button
              label="Add a debt"
              onPress={() => router.push({ pathname: '/debt/[id]', params: { id: 'new' } })}
              disabled={debts.length >= MAX_DEBTS}
              testID="add-debt"
            />
            {debts.length >= MAX_DEBTS && <Note>You can add up to {MAX_DEBTS} debts.</Note>}
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg },
  header: { marginBottom: space.lg, gap: space.xs },
  card: { gap: space.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  name: { fontSize: font.body, fontWeight: '700', color: colors.text, flexShrink: 1 },
  amount: { fontSize: font.body, fontWeight: '700', color: colors.accent },
  detail: { fontSize: font.small, color: colors.muted },
  warning: { fontSize: font.small, color: colors.danger },
  footer: { marginTop: space.lg, gap: space.sm },
});
