import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPounds } from '@domain/money';
import { addMonths, formatMonth } from '@domain/months';
import { Note, Screen } from '@/components/ui';
import { usePlan } from '@/lib/usePlan';
import { colors, font, space } from '@/theme';

const ROW = 64;

/** Every month of the chosen plan. A plan can run for up to 600 months, so the list only draws the rows on screen. */
export default function ScheduleScreen() {
  const router = useRouter();
  const { plan, start } = usePlan();

  return (
    <Screen>
      <FlatList
        data={plan.months}
        keyExtractor={(m) => String(m.month)}
        getItemLayout={(_, index) => ({ length: ROW, offset: ROW * index, index })}
        ListHeaderComponent={
          <View style={styles.header}>
            <Note>
              What is paid, the interest added and what is still owed, at the end of each month. Tap a month
              to see how it was worked out.
            </Note>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>There is nothing to show. Add a debt first.</Text>}
        renderItem={({ item }) => {
          const date = formatMonth(addMonths(start, item.month - 1));
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/month/[n]', params: { n: String(item.month) } })}
              accessibilityRole="button"
              accessibilityLabel={`Month ${item.month}, ${date}. Paid ${formatPounds(item.payment)}, interest ${formatPounds(item.interest)}, still owed ${formatPounds(item.closing)}`}
              accessibilityHint="Shows how this month was worked out"
              style={styles.row}
              testID={`month-${item.month}`}
            >
              <View style={styles.left}>
                <Text style={styles.month}>Month {item.month}</Text>
                <Text style={styles.date}>{date}</Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.paid}>Paid {formatPounds(item.payment)}</Text>
                <Text style={styles.owed}>Owed {formatPounds(item.closing)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { padding: space.lg },
  empty: { padding: space.lg, color: colors.muted },
  row: {
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  left: { gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  month: { fontSize: font.body, fontWeight: '700', color: colors.text },
  date: { fontSize: font.small, color: colors.muted },
  paid: { fontSize: font.small, color: colors.text },
  owed: { fontSize: font.body, fontWeight: '700', color: colors.accent },
});
