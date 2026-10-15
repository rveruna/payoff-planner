import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Share } from 'react-native';
import { parseScenario } from '@domain/scenario';
import { useLockState } from '@/lib/appLock';
import { webLink } from '@/lib/shareLink';
import { useScenarioStore } from '@/store/scenarioStore';
import { DEFAULT_SETTINGS } from '@/store/settings';
import { renderApp } from '@/test/render';
import { resetStore } from '@/test/helpers';

beforeEach(resetStore);

const store = () => useScenarioStore.getState();
const toggle = async (testID: string, value: boolean) =>
  fireEvent(await screen.findByTestId(testID), 'valueChange', value);
const permissions = jest.mocked(Notifications.getPermissionsAsync);
const requestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const authenticate = jest.mocked(LocalAuthentication.authenticateAsync);

describe('the settings tab', () => {
  it('says that the debts stay on the device', async () => {
    await renderApp('/settings');
    expect(
      await screen.findByText(
        /kept only on this device, in the system’s secure storage, and nothing is sent anywhere/,
      ),
    ).toBeOnTheScreen();
  });

  it('says what the app is and is not', async () => {
    await renderApp('/settings');
    expect(await screen.findByText(/educational demo, not financial advice/)).toBeOnTheScreen();
    expect(screen.getByText(/Version 0\.1\.0/)).toBeOnTheScreen();
  });
});

describe('the app lock', () => {
  it('is off to begin with, and can be turned on once the person has been checked', async () => {
    await renderApp('/settings');
    expect(await screen.findByTestId('lock-switch')).toHaveProp('value', false);

    await toggle('lock-switch', true);

    expect(authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Turn on the app lock' }),
    );
    await waitFor(() => expect(store().settings.appLock).toBe(true));
    // the person has just proved who they are, so they are not asked again straight away
    expect(useLockState.getState().unlocked).toBe(true);
  });

  it('stays off, and says why, when the check does not succeed', async () => {
    authenticate.mockResolvedValueOnce({ success: false, error: 'user_cancel' } as never);
    await renderApp('/settings');

    await toggle('lock-switch', true);

    expect(
      await screen.findByText('The app lock was not turned on, because the check did not succeed.'),
    ).toBeOnTheScreen();
    expect(store().settings.appLock).toBe(false);
  });

  it('can be turned off', async () => {
    store().updateSettings({ appLock: true });
    // the app starts locked when the lock is on, so it is unlocked first
    useLockState.getState().setUnlocked(true);
    await renderApp('/settings');

    await toggle('lock-switch', false);

    await waitFor(() => expect(store().settings.appLock).toBe(false));
  });

  it.each([
    [
      'no fingerprint, face or passcode hardware',
      () => jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValueOnce(false),
    ],
    [
      'nothing set up on the phone',
      () => jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValueOnce(false),
    ],
  ])('is not offered with %s', async (_name, arrange) => {
    arrange();
    await renderApp('/settings');

    await waitFor(() => expect(screen.getByTestId('lock-switch')).toBeDisabled());
    expect(screen.getByText(/needs a phone with a fingerprint, face or passcode/)).toBeOnTheScreen();
  });

  it('is announced as a switch with its state', async () => {
    await renderApp('/settings');
    const lock = await screen.findByTestId('lock-switch');

    expect(lock.props.accessibilityRole).toBe('switch');
    expect(lock.props.accessibilityLabel).toBe('App lock');
  });
});

describe('the monthly reminder', () => {
  it('asks nothing when permission is already given, and schedules one notification a month at 9am', async () => {
    await renderApp('/settings');

    await toggle('reminder-switch', true);

    await waitFor(() => expect(store().settings.remindersEnabled).toBe(true));
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls[0]![0].trigger).toMatchObject({ type: 'monthly', day: 1, hour: 9, minute: 0 });
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('says nothing about amounts or debts in the notification, since it can be read on a locked screen', async () => {
    await renderApp('/settings');

    await toggle('reminder-switch', true);

    await waitFor(() => expect(schedule).toHaveBeenCalled());
    const content = schedule.mock.calls[0]![0].content;
    expect(`${content.title} ${content.body}`).not.toMatch(/[£0-9]/);
  });

  it('asks for permission when it has not been given yet, and goes ahead if it is granted', async () => {
    permissions.mockResolvedValueOnce({ granted: false, canAskAgain: true } as never);
    await renderApp('/settings');

    await toggle('reminder-switch', true);

    await waitFor(() => expect(store().settings.remindersEnabled).toBe(true));
    expect(requestPermissions).toHaveBeenCalled();
  });

  it.each([
    ['refused when asked', { granted: false, canAskAgain: true }, { granted: false }],
    ['already refused for good', { granted: false, canAskAgain: false }, null],
  ])(
    'says to use the phone’s settings when permission is %s, and does not schedule anything',
    async (_name, current, asked) => {
      permissions.mockResolvedValueOnce(current as never);
      if (asked) requestPermissions.mockResolvedValueOnce(asked as never);
      await renderApp('/settings');

      await toggle('reminder-switch', true);

      expect(await screen.findByTestId('reminder-message')).toHaveTextContent(
        /Notifications are turned off for this app/,
      );
      expect(schedule).not.toHaveBeenCalled();
      expect(store().settings.remindersEnabled).toBe(false);
    },
  );

  it('cancels the reminder when turned off', async () => {
    store().updateSettings({ remindersEnabled: true });
    await renderApp('/settings');

    await toggle('reminder-switch', false);

    await waitFor(() => expect(store().settings.remindersEnabled).toBe(false));
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  it('moves the day with the buttons, within the days every month has', async () => {
    await renderApp('/settings');
    expect(await screen.findByTestId('reminder-day')).toHaveTextContent('Day 1, 9am');
    expect(screen.getByTestId('day-down')).toBeDisabled();

    await fireEvent.press(screen.getByTestId('day-up'));
    expect(screen.getByTestId('reminder-day')).toHaveTextContent('Day 2, 9am');

    await act(async () => store().updateSettings({ reminderDay: 28 }));
    await waitFor(() => expect(screen.getByTestId('day-up')).toBeDisabled());
  });

  it('moves a reminder that is already on to the new day', async () => {
    store().updateSettings({ remindersEnabled: true, reminderDay: 10 });
    await renderApp('/settings');

    await fireEvent.press(await screen.findByTestId('day-up'));

    await waitFor(() => expect(schedule).toHaveBeenCalledTimes(1));
    expect(schedule.mock.calls[0]![0].trigger).toMatchObject({ day: 11 });
  });

  it('does not schedule anything when the day changes while the reminder is off', async () => {
    await renderApp('/settings');

    await fireEvent.press(await screen.findByTestId('day-up'));

    expect(schedule).not.toHaveBeenCalled();
  });
});

describe('sharing the plan', () => {
  it('shares a link to the web version, which holds the whole plan', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await renderApp('/settings');

    await fireEvent.press(await screen.findByTestId('share'));

    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0]![0].message).toContain('https://rveruna.github.io/payoff-planner/');
  });

  it('shows the same link on the screen to copy, and it follows the plan', async () => {
    await renderApp('/settings');
    const link = await screen.findByTestId('share-link');
    expect(link).toHaveTextContent('https://rveruna.github.io/payoff-planner/');

    await act(async () => store().setStrategy('snowball'));

    await waitFor(() => expect(screen.getByTestId('share-link')).toHaveTextContent(/s=snowball/));
  });

  it('opens, in the web version, the very plan that is in the app', async () => {
    const { debts, extra, strategy } = store();
    const link = new URL(webLink({ debts, extra, strategy }));

    const opened = parseScenario(link.search);

    expect(opened.debts.map((d) => ({ ...d, id: '' }))).toEqual(debts.map((d) => ({ ...d, id: '' })));
    expect([opened.extra, opened.strategy]).toEqual([extra, strategy]);
  });

  it('says what to do when sharing is not available', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('no'));
    await renderApp('/settings');

    await fireEvent.press(await screen.findByTestId('share'));

    expect(
      await screen.findByText('Sharing is not available here. You can copy the link below.'),
    ).toBeOnTheScreen();
  });
});

describe('your data', () => {
  it('puts the sample debts back', async () => {
    store().clearAll();
    await renderApp('/settings');

    await fireEvent.press(await screen.findByTestId('sample'));

    expect(store().debts).toHaveLength(5);
    expect(store().extra).toBe(15_000);
  });

  it('asks twice before deleting everything, then clears the debts, the settings and the reminder', async () => {
    store().updateSettings({ remindersEnabled: true, appLock: true });
    // the app starts locked when the lock is on, so it is unlocked first
    useLockState.getState().setUnlocked(true);
    await renderApp('/settings');

    await fireEvent.press(await screen.findByTestId('clear'));
    expect(store().debts).toHaveLength(5);

    await fireEvent.press(screen.getByTestId('confirm-clear'));

    await waitFor(() => expect(store().debts).toEqual([]));
    expect(store().settings).toEqual(DEFAULT_SETTINGS);
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(await screen.findByTestId('clear')).toBeOnTheScreen();
  });
});
