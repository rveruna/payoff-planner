import * as LocalAuthentication from 'expo-local-authentication';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { AppState, type AppStateStatus } from 'react-native';
import { RELOCK_AFTER_MS, useLockState } from '@/lib/appLock';
import { useScenarioStore } from '@/store/scenarioStore';
import { renderApp } from '@/test/render';
import { resetStore } from '@/test/helpers';

beforeEach(resetStore);

const authenticate = jest.mocked(LocalAuthentication.authenticateAsync);

describe('before the plan has been loaded', () => {
  it('shows a loading message and none of the debts', async () => {
    useScenarioStore.setState({ hydrated: false });
    await renderApp();

    expect(await screen.findByText('Loading your plan…')).toBeOnTheScreen();
    expect(screen.queryByText(/You owe/)).toBeNull();
  });
});

describe('with the app lock on', () => {
  beforeEach(() =>
    useScenarioStore.setState({ settings: { remindersEnabled: false, reminderDay: 1, appLock: true } }),
  );

  it('shows nothing about the debts until the person has been checked', async () => {
    await renderApp();

    expect(await screen.findByText('Payoff Planner is locked')).toBeOnTheScreen();
    expect(screen.getByText('Your debts are hidden until you unlock the app.')).toBeOnTheScreen();
    expect(screen.queryByText(/You owe/)).toBeNull();
    expect(screen.queryByText('Store card')).toBeNull();
  });

  it('shows the debts once the check succeeds', async () => {
    await renderApp();

    await fireEvent.press(await screen.findByTestId('unlock'));

    expect(await screen.findByText('You owe £17,830.00')).toBeOnTheScreen();
    expect(authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Unlock Payoff Planner' }),
    );
  });

  it('stays locked when the check fails or is cancelled', async () => {
    authenticate.mockResolvedValueOnce({ success: false, error: 'user_cancel' } as never);
    await renderApp();

    await fireEvent.press(await screen.findByTestId('unlock'));

    expect(await screen.findByText('Payoff Planner is locked')).toBeOnTheScreen();
    expect(screen.queryByText(/You owe/)).toBeNull();
  });

  it('stays locked, and does not crash, when the check throws', async () => {
    authenticate.mockRejectedValueOnce(new Error('hardware gone'));
    await renderApp();

    await fireEvent.press(await screen.findByTestId('unlock'));

    expect(await screen.findByText('Payoff Planner is locked')).toBeOnTheScreen();
  });

  it('does not ask again while the app is in use', async () => {
    await renderApp();
    await fireEvent.press(await screen.findByTestId('unlock'));
    await screen.findByText('You owe £17,830.00');

    await act(async () => useScenarioStore.getState().setStrategy('snowball'));

    expect(screen.queryByText('Payoff Planner is locked')).toBeNull();
  });

  describe('after the app has been in the background', () => {
    let listener: (state: AppStateStatus) => void;

    beforeEach(() => {
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
        listener = handler as typeof listener;
        return { remove: jest.fn() };
      });
    });

    const unlocked = async () => {
      useLockState.getState().setUnlocked(true);
      await renderApp();
      await screen.findByText('You owe £17,830.00');
    };

    // the router's test renderer runs on Jest's fake clock, so time passes by moving that clock
    const away = async (ms: number, state: AppStateStatus = 'background') => {
      const left = Date.now();
      await act(async () => listener(state));
      jest.setSystemTime(left + ms);
      await act(async () => listener('active'));
    };

    it('locks again after more than a minute away', async () => {
      await unlocked();

      await away(RELOCK_AFTER_MS + 1);

      expect(await screen.findByText('Payoff Planner is locked')).toBeOnTheScreen();
      expect(screen.queryByText(/You owe/)).toBeNull();
    });

    it('does not lock after a short time away', async () => {
      await unlocked();

      await away(RELOCK_AFTER_MS - 1);

      expect(screen.queryByText('Payoff Planner is locked')).toBeNull();
    });

    it('does not lock at exactly a minute, only after more than a minute', async () => {
      await unlocked();

      await away(RELOCK_AFTER_MS);

      expect(screen.queryByText('Payoff Planner is locked')).toBeNull();
    });

    it('does not lock when it was only inactive, as when a notification pulls down', async () => {
      await unlocked();

      await away(RELOCK_AFTER_MS * 5, 'inactive');

      await waitFor(() => expect(screen.queryByText('Payoff Planner is locked')).toBeNull());
    });
  });
});

describe('with the app lock off', () => {
  it('never asks', async () => {
    await renderApp();

    expect(await screen.findByText('You owe £17,830.00')).toBeOnTheScreen();
    expect(authenticate).not.toHaveBeenCalled();
  });
});
