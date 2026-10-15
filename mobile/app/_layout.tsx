import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Button, Heading, Note, Screen } from '@/components/ui';
import { useAppLock } from '@/lib/appLock';
import { configureNotifications } from '@/lib/reminders';
import { useScenarioStore } from '@/store/scenarioStore';
import { colors, space } from '@/theme';

export default function RootLayout() {
  const hydrated = useScenarioStore((s) => s.hydrated);
  const appLock = useScenarioStore((s) => s.settings.appLock);
  const { locked, unlock } = useAppLock(hydrated && appLock);

  useEffect(() => {
    configureNotifications();
  }, []);

  // nothing about the debts is drawn until what was saved has been read, and not at all while the app is locked
  if (!hydrated) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator accessibilityLabel="Loading" color={colors.accent} />
        <Text style={styles.loading}>Loading your plan…</Text>
      </Screen>
    );
  }
  if (locked) {
    return (
      <Screen style={styles.center}>
        <Heading>Payoff Planner is locked</Heading>
        <Note style={styles.lockNote}>Your debts are hidden until you unlock the app.</Note>
        <Button label="Unlock" onPress={unlock} testID="unlock" />
      </Screen>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="debt/[id]" options={{ presentation: 'modal', title: 'Debt' }} />
        <Stack.Screen name="schedule" options={{ title: 'Month by month' }} />
        <Stack.Screen name="month/[n]" options={{ title: 'Month' }} />
        <Stack.Screen name="import" options={{ presentation: 'modal', title: 'Import a plan' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  loading: { color: colors.muted },
  lockNote: { textAlign: 'center' },
});
