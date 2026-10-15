import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { MAX_EXTRA } from '@domain/scenario';
import { useScenarioStore } from '@/store/scenarioStore';
import { openTab, pathname, renderApp } from '@/test/render';
import { resetStore } from '@/test/helpers';

beforeEach(resetStore);

const store = () => useScenarioStore.getState();

describe('the plan tab', () => {
  it('says when the debts are cleared, what it costs and what that saves', async () => {
    await renderApp('/plan');

    expect(await screen.findByText('April 2029')).toBeOnTheScreen();
    expect(screen.getByText('after 2 years 7 months of payments, with', { exact: false })).toBeOnTheScreen();
    expect(screen.getByText('£3,814.71')).toBeOnTheScreen();
    expect(
      screen.getByText(/£5,697\.71 less interest and 4 years 4 months sooner than paying only the minimums/),
    ).toBeOnTheScreen();
  });

  it('announces the answer, so a change is heard', async () => {
    await renderApp('/plan');

    const announced = await screen.findByLabelText('Debt-free in April 2029');

    expect(announced.props.accessibilityLiveRegion).toBe('polite');
  });

  it('compares the three ways of paying, with their dates and interest', async () => {
    await renderApp('/plan');
    await screen.findByText('April 2029');

    expect(screen.getByLabelText(/^Avalanche\..* April 2029, £3,814\.71 interest$/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Snowball\..* May 2029, £4,565\.40 interest$/)).toBeOnTheScreen();
    expect(
      screen.getByLabelText(/^Minimum payments only\..* August 2033, £9,512\.42 interest$/),
    ).toBeOnTheScreen();
  });
});

describe('choosing how to pay', () => {
  it('is a group of radio buttons, with avalanche chosen to begin with', async () => {
    await renderApp('/plan');

    expect(await screen.findByTestId('strategy-avalanche')).toBeChecked();
    expect(screen.getByTestId('strategy-snowball')).not.toBeChecked();
    // the group is not itself an accessibility element, or a screen reader would merge the three options into one
    expect(screen.getByLabelText('How to pay them off').props.accessibilityRole).toBe('radiogroup');
  });

  it('switches the plan, and keeps the choice', async () => {
    await renderApp('/plan');

    await fireEvent.press(await screen.findByTestId('strategy-snowball'));

    expect(store().strategy).toBe('snowball');
    expect(await screen.findByText('May 2029')).toBeOnTheScreen();
    expect(screen.getByTestId('strategy-snowball')).toBeChecked();
  });

  it('shows the minimum plan without a saving, since there is nothing to compare it with', async () => {
    await renderApp('/plan');

    await fireEvent.press(await screen.findByTestId('strategy-minimum'));

    expect(await screen.findByText('August 2033')).toBeOnTheScreen();
    expect(screen.queryByText(/less interest/)).toBeNull();
  });
});

describe('the extra payment', () => {
  it('goes up and down by £10, and every result follows', async () => {
    await renderApp('/plan');
    expect(await screen.findByTestId('extra-value')).toHaveTextContent('£150.00');

    await fireEvent.press(screen.getByTestId('extra-up'));
    expect(screen.getByTestId('extra-value')).toHaveTextContent('£160.00');
    expect(store().extra).toBe(16_000);

    await fireEvent.press(screen.getByTestId('extra-down'));
    await fireEvent.press(screen.getByTestId('extra-down'));
    expect(screen.getByTestId('extra-value')).toHaveTextContent('£140.00');
  });

  it('shortens the plan when more is paid', async () => {
    await renderApp('/plan');
    await screen.findByText('April 2029');

    for (let i = 0; i < 25; i++) await fireEvent.press(screen.getByTestId('extra-up'));

    expect(screen.queryByText('April 2029')).toBeNull();
    expect(store().extra).toBe(40_000);
  });

  it('cannot go below nothing, or above the limit', async () => {
    useScenarioStore.setState({ extra: 0 });
    await renderApp('/plan');
    expect(await screen.findByTestId('extra-down')).toBeDisabled();

    await act(async () => useScenarioStore.setState({ extra: MAX_EXTRA }));
    await waitFor(() => expect(screen.getByTestId('extra-up')).toBeDisabled());
  });

  it('has buttons that say what they do, and a value that is read out', async () => {
    await renderApp('/plan');
    const value = await screen.findByTestId('extra-value');

    expect(screen.getByLabelText('Increase the extra by £10')).toBeOnTheScreen();
    expect(screen.getByLabelText('Decrease the extra by £10')).toBeOnTheScreen();
    expect(value.props.accessibilityLabel).toBe('Extra £150.00 a month');
    expect(value.props.accessibilityLiveRegion).toBe('polite');
  });
});

describe('looking at a month', () => {
  it('starts at the first month', async () => {
    await renderApp('/plan');
    expect(await screen.findByTestId('month-label')).toHaveTextContent('Month 1 · October 2026');
    expect(screen.getByTestId('month-prev')).toBeDisabled();
  });

  it('moves a month at a time with the buttons', async () => {
    await renderApp('/plan');

    await fireEvent.press(await screen.findByTestId('month-next'));
    await fireEvent.press(screen.getByTestId('month-next'));
    expect(screen.getByTestId('month-label')).toHaveTextContent('Month 3 · December 2026');

    await fireEvent.press(screen.getByTestId('month-prev'));
    expect(screen.getByTestId('month-label')).toHaveTextContent('Month 2 · November 2026');
  });

  it('plays the plan through month by month, then offers to play again', async () => {
    useScenarioStore.setState({
      debts: [{ id: 'a', name: 'Card', balance: 30_000, aprBp: 0, minPayment: 10_000 }],
      extra: 0,
    });
    await renderApp('/plan');

    await fireEvent.press(await screen.findByTestId('play'));

    await waitFor(() => expect(screen.getByTestId('month-label')).toHaveTextContent(/^Month 3 ·/), {
      timeout: 3000,
    });
    expect(await screen.findByText('Play again')).toBeOnTheScreen();
  });

  it('can be paused', async () => {
    await renderApp('/plan');

    await fireEvent.press(await screen.findByTestId('play'));
    expect(await screen.findByText('Pause')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('play'));

    expect(await screen.findByText('Play')).toBeOnTheScreen();
  });

  it('stops playing when a month is chosen by hand', async () => {
    await renderApp('/plan');

    await fireEvent.press(await screen.findByTestId('play'));
    await fireEvent.press(screen.getByTestId('month-next'));

    expect(await screen.findByText('Play')).toBeOnTheScreen();
  });
});

describe('the charts', () => {
  it('are each one adjustable control, described in words, with the month read out', async () => {
    await renderApp('/plan');
    await screen.findByText('April 2029');
    const [race, stack] = screen.getAllByTestId('chart');

    expect(race!.props.accessibilityRole).toBe('adjustable');
    expect(race!.props.accessibilityLabel).toMatch(/Avalanche is clear in April 2029, after 31 months/);
    expect(race!.props.accessibilityLabel).toMatch(/Minimum payments only is clear in August 2033/);
    expect(stack!.props.accessibilityLabel).toMatch(/Overdraft is cleared in March 2027/);
    expect(race!.props.accessibilityValue).toEqual({
      min: 1,
      max: 31,
      now: 1,
      text: 'Month 1, October 2026',
    });
  });

  it('move the month when a screen reader swipes up or down', async () => {
    await renderApp('/plan');
    await screen.findByText('April 2029');
    const [race] = screen.getAllByTestId('chart');

    await fireEvent(race!, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await fireEvent(race!, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(screen.getByTestId('month-label')).toHaveTextContent(/^Month 3 ·/);

    await fireEvent(race!, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(screen.getByTestId('month-label')).toHaveTextContent(/^Month 2 ·/);
  });

  it('do not go past either end of the plan', async () => {
    await renderApp('/plan');
    await screen.findByText('April 2029');
    const [race] = screen.getAllByTestId('chart');

    await fireEvent(race!, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(screen.getByTestId('month-label')).toHaveTextContent(/^Month 1 ·/);
  });

  it('list each plan and where it stands in the month being looked at', async () => {
    await renderApp('/plan');

    // avalanche and snowball happen to owe the same in the first month, so the line appears for both
    expect((await screen.findAllByText(/owes £17,371\.36 in month 1/)).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Minimum payments only.*owes £17,\d{3}\.\d\d in month 1/)).toBeOnTheScreen();
  });

  it('say so when a plan never finishes', async () => {
    useScenarioStore.setState({
      debts: [{ id: 'a', name: 'Card', balance: 100_000, aprBp: 2400, minPayment: 1_000 }],
      extra: 0,
    });
    await renderApp('/plan');

    expect(await screen.findByText('These payments never clear the debts')).toBeOnTheScreen();
    const [race] = screen.getAllByTestId('chart');
    expect(race!.props.accessibilityLabel).toMatch(/Minimum payments only never clears the debts/);
  });
});

describe('with nothing to pay', () => {
  it('says so, and shows no charts or month controls', async () => {
    useScenarioStore.setState({ debts: [] });
    await renderApp('/plan');

    expect(await screen.findByText('There are no debts to pay off.')).toBeOnTheScreen();
    expect(screen.queryByTestId('chart')).toBeNull();
    expect(screen.queryByTestId('play')).toBeNull();
  });
});

describe('going further', () => {
  it('opens the working for the month being looked at', async () => {
    await renderApp('/plan');

    await fireEvent.press(await screen.findByTestId('month-next'));
    await fireEvent.press(screen.getByTestId('open-working'));

    expect(pathname()).toBe('/month/2');
  });

  it('opens the list of every month', async () => {
    await renderApp('/plan');

    await fireEvent.press(await screen.findByTestId('open-schedule'));

    expect(pathname()).toBe('/schedule');
  });

  it('is reached from the tab bar, and keeps the choices when the tabs change', async () => {
    await renderApp();
    await openTab('Plan');
    await fireEvent.press(await screen.findByTestId('strategy-snowball'));

    await openTab('Debts');
    await openTab('Plan');

    expect(await screen.findByTestId('strategy-snowball')).toBeChecked();
  });
});
