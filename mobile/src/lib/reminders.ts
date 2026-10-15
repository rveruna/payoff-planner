import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type ReminderResult = 'scheduled' | 'denied' | 'unsupported';

/** The reminder arrives at 9am on the chosen day of the month. */
export const REMINDER_HOUR = 9;

const CHANNEL = 'payments';

/** Scheduled notifications need a phone: a closed browser tab cannot fire one. */
export const remindersSupported = () => Platform.OS !== 'web';

/** Shows a reminder even while the app is open, instead of quietly dropping it. */
export function configureNotifications() {
  if (!remindersSupported()) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Asks for permission if needed, then schedules one reminder a month. The text says nothing about amounts or debts, because
 * a notification can be read on a locked screen.
 */
export async function scheduleMonthlyReminder(day: number): Promise<ReminderResult> {
  if (!remindersSupported()) return 'unsupported';

  const current = await Notifications.getPermissionsAsync();
  const granted =
    current.granted || (current.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
  if (!granted) return 'denied';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Payment reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Payment day',
      body: 'Time to make your payments. Open Payoff Planner to see this month’s plan.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day,
      hour: REMINDER_HOUR,
      minute: 0,
      channelId: CHANNEL,
    },
  });
  return 'scheduled';
}

export async function cancelReminders(): Promise<void> {
  if (!remindersSupported()) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
