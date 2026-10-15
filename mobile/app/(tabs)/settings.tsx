import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, Heading, Note, Screen } from '@/components/ui';
import { authenticate, lockAvailable, useLockState } from '@/lib/appLock';
import { cancelReminders, remindersSupported, REMINDER_HOUR, scheduleMonthlyReminder } from '@/lib/reminders';
import { webLink } from '@/lib/shareLink';
import { MAX_REMINDER_DAY, MIN_REMINDER_DAY } from '@/store/settings';
import { useScenarioStore } from '@/store/scenarioStore';
import { colors, font, space } from '@/theme';

export default function SettingsScreen() {
  const settings = useScenarioStore((s) => s.settings);
  const debts = useScenarioStore((s) => s.debts);
  const extra = useScenarioStore((s) => s.extra);
  const strategy = useScenarioStore((s) => s.strategy);
  const { updateSettings, resetToSample, clearAll } = useScenarioStore.getState();

  const [lockOk, setLockOk] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [lockMessage, setLockMessage] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    lockAvailable().then(setLockOk);
  }, []);

  const link = webLink({ debts, extra, strategy });

  async function toggleLock(on: boolean) {
    setLockMessage('');
    if (!on) return updateSettings({ appLock: false });
    // prove it is the owner turning it on, so a lock cannot be set by someone else and then forgotten
    if (await authenticate('Turn on the app lock')) {
      updateSettings({ appLock: true });
      useLockState.getState().setUnlocked(true);
    } else {
      setLockMessage('The app lock was not turned on, because the check did not succeed.');
    }
  }

  async function toggleReminders(on: boolean) {
    setReminderMessage('');
    if (!on) {
      await cancelReminders();
      return updateSettings({ remindersEnabled: false });
    }
    const result = await scheduleMonthlyReminder(settings.reminderDay);
    if (result === 'scheduled') updateSettings({ remindersEnabled: true });
    else if (result === 'denied')
      setReminderMessage(
        'Notifications are turned off for this app. Turn them on in your phone’s settings, then try again.',
      );
    else setReminderMessage('Reminders work on a phone. A browser tab cannot send one while it is closed.');
  }

  async function changeDay(day: number) {
    const next = Math.min(Math.max(day, MIN_REMINDER_DAY), MAX_REMINDER_DAY);
    updateSettings({ reminderDay: next });
    if (settings.remindersEnabled) await scheduleMonthlyReminder(next);
  }

  async function share() {
    try {
      await Share.share({ message: `My debt payoff plan: ${link}` });
      setShareMessage('');
    } catch {
      setShareMessage('Sharing is not available here. You can copy the link below.');
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.gap}>
          <Heading>Privacy</Heading>
          <Note>
            Your debts are kept only on this device, in the system’s secure storage, and nothing is sent
            anywhere. There is no account and no server.
          </Note>
        </Card>

        <Card style={styles.gap}>
          <View style={styles.row}>
            <Text style={styles.label}>App lock</Text>
            <Switch
              value={settings.appLock}
              onValueChange={toggleLock}
              disabled={!lockOk}
              accessibilityLabel="App lock"
              accessibilityState={{ disabled: !lockOk }}
              trackColor={{ true: colors.accent, false: '#c9ced8' }}
              testID="lock-switch"
            />
          </View>
          <Note>
            {lockOk
              ? 'Ask for your fingerprint, face or passcode when the app opens, and after a minute away. Nothing is shown until it succeeds.'
              : 'This needs a phone with a fingerprint, face or passcode set up. It is not available in a browser.'}
          </Note>
          {lockMessage ? (
            <Text style={styles.problem} accessibilityRole="alert">
              {lockMessage}
            </Text>
          ) : null}
        </Card>

        <Card style={styles.gap}>
          <View style={styles.row}>
            <Text style={styles.label}>Monthly payment reminder</Text>
            <Switch
              value={settings.remindersEnabled}
              onValueChange={toggleReminders}
              accessibilityLabel="Monthly payment reminder"
              trackColor={{ true: colors.accent, false: '#c9ced8' }}
              testID="reminder-switch"
            />
          </View>
          <View style={styles.row}>
            <Button
              label="−"
              variant="secondary"
              accessibilityLabel="Earlier day of the month"
              onPress={() => changeDay(settings.reminderDay - 1)}
              disabled={settings.reminderDay <= MIN_REMINDER_DAY}
              testID="day-down"
            />
            <Text style={styles.day} accessibilityLiveRegion="polite" testID="reminder-day">
              Day {settings.reminderDay}, {REMINDER_HOUR}am
            </Text>
            <Button
              label="+"
              variant="secondary"
              accessibilityLabel="Later day of the month"
              onPress={() => changeDay(settings.reminderDay + 1)}
              disabled={settings.reminderDay >= MAX_REMINDER_DAY}
              testID="day-up"
            />
          </View>
          <Note>
            {remindersSupported()
              ? 'A reminder on this day each month. It says nothing about amounts, because a notification can be read on a locked screen.'
              : 'Reminders need a phone. In a browser they are not available.'}
          </Note>
          {reminderMessage ? (
            <Text style={styles.problem} accessibilityRole="alert" testID="reminder-message">
              {reminderMessage}
            </Text>
          ) : null}
        </Card>

        <Card style={styles.gap}>
          <Heading>Share this plan</Heading>
          <Note>
            The link opens your plan in the web version, which needs no app. It contains your debts, so only
            send it to people you trust.
          </Note>
          <Button label="Share a link to this plan" onPress={share} testID="share" />
          {shareMessage ? <Note>{shareMessage}</Note> : null}
          <Text selectable style={styles.link} testID="share-link">
            {link}
          </Text>
        </Card>

        <Card style={styles.gap}>
          <Heading>Your data</Heading>
          <Button
            label="Use the sample debts"
            variant="secondary"
            onPress={resetToSample}
            hint="Replaces your debts with the invented examples"
            testID="sample"
          />
          {confirmClear ? (
            <Button
              label="Tap again to delete everything"
              variant="danger"
              onPress={async () => {
                await cancelReminders();
                clearAll();
                setConfirmClear(false);
              }}
              testID="confirm-clear"
            />
          ) : (
            <Button
              label="Delete all my data"
              variant="danger"
              onPress={() => setConfirmClear(true)}
              testID="clear"
            />
          )}
        </Card>

        <Card style={styles.gap}>
          <Heading>About</Heading>
          <Note>
            Payoff Planner compares ways of paying off debts and shows how every number is worked out. It is
            an educational demo, not financial advice. The sample debts and rates are invented. Interest is
            charged monthly at a twelfth of the yearly rate, rounded to the nearest penny; real lenders
            differ.
          </Note>
          <Note>Version {Constants.expoConfig?.version ?? '0.1.0'}</Note>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md },
  gap: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  label: { fontSize: font.body, fontWeight: '700', color: colors.text, flexShrink: 1 },
  day: { fontSize: font.body, fontWeight: '700', color: colors.accent },
  problem: { color: colors.danger, fontSize: font.small },
  link: { fontSize: 12, color: colors.muted },
});
