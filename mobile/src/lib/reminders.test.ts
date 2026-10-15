import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  cancelReminders,
  configureNotifications,
  REMINDER_HOUR,
  remindersSupported,
  scheduleMonthlyReminder,
} from './reminders';

const permissions = jest.mocked(Notifications.getPermissionsAsync);
const request = jest.mocked(Notifications.requestPermissionsAsync);
const schedule = jest.mocked(Notifications.scheduleNotificationAsync);

beforeEach(jest.clearAllMocks);

describe('on a phone', () => {
  it('is supported', () => {
    expect(remindersSupported()).toBe(true);
  });

  it('schedules one monthly notification on the chosen day at 9am, replacing any earlier one', async () => {
    const result = await scheduleMonthlyReminder(17);

    expect(result).toBe('scheduled');
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls[0]![0].trigger).toMatchObject({
      type: 'monthly',
      day: 17,
      hour: REMINDER_HOUR,
      minute: 0,
    });
  });

  it('cancels the old reminder before it makes the new one, so there is never more than one', async () => {
    const order: string[] = [];
    jest
      .mocked(Notifications.cancelAllScheduledNotificationsAsync)
      .mockImplementationOnce(async () => void order.push('cancel'));
    schedule.mockImplementationOnce(async () => (order.push('schedule'), 'id'));

    await scheduleMonthlyReminder(5);

    expect(order).toEqual(['cancel', 'schedule']);
  });

  it('shows a reminder even while the app is open', async () => {
    configureNotifications();
    const handler = jest.mocked(Notifications.setNotificationHandler).mock.calls[0]![0]!;

    expect(await handler.handleNotification({} as never)).toMatchObject({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
    });
  });

  it('asks for permission only when it has not been given and can still be asked for', async () => {
    permissions.mockResolvedValueOnce({ granted: false, canAskAgain: true } as never);

    expect(await scheduleMonthlyReminder(1)).toBe('scheduled');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not ask again when permission is already given', async () => {
    await scheduleMonthlyReminder(1);
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    ['refused when asked', { granted: false, canAskAgain: true }, { granted: false }],
    ['refused for good', { granted: false, canAskAgain: false }, { granted: true }],
  ])('reports denied, and schedules nothing, when permission is %s', async (_name, current, asked) => {
    permissions.mockResolvedValueOnce(current as never);
    request.mockResolvedValueOnce(asked as never);

    expect(await scheduleMonthlyReminder(1)).toBe('denied');
    expect(schedule).not.toHaveBeenCalled();
    expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it('keeps the words free of amounts and debts', async () => {
    await scheduleMonthlyReminder(1);
    const { title, body } = schedule.mock.calls[0]![0].content;

    expect(`${title} ${body}`).not.toMatch(/[£0-9]|debt|owe/i);
  });

  it('cancels every reminder when asked', async () => {
    await cancelReminders();
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });
});

describe('on Android', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));
  afterEach(() => jest.restoreAllMocks());

  it('makes the notification channel that Android needs, and uses it', async () => {
    await scheduleMonthlyReminder(3);

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'payments',
      expect.objectContaining({ name: 'Payment reminders' }),
    );
    expect(schedule.mock.calls[0]![0].trigger).toMatchObject({ channelId: 'payments' });
  });
});

describe('in a browser', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'web'));
  afterEach(() => jest.restoreAllMocks());

  it('is not supported, because a closed tab cannot send a notification', async () => {
    expect(remindersSupported()).toBe(false);
    expect(await scheduleMonthlyReminder(1)).toBe('unsupported');
    expect(permissions).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });

  it('does nothing when set up or cancelled', async () => {
    configureNotifications();
    await cancelReminders();

    expect(Notifications.setNotificationHandler).not.toHaveBeenCalled();
    expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });
});

describe('the promises made to the person', () => {
  it('arrives at 9am, as the settings screen says', () => {
    expect(REMINDER_HOUR).toBe(9);
  });
});
