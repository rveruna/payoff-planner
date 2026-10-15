import { fireEvent, screen } from 'expo-router/testing-library';
import { useScenarioStore } from '@/store/scenarioStore';
import { pathname, renderApp } from '@/test/render';
import { resetStore } from '@/test/helpers';

beforeEach(resetStore);

describe('the month by month list', () => {
  it('lists the months with what is paid and what is owed, and says what tapping does', async () => {
    await renderApp('/schedule');
    const first = await screen.findByTestId('month-1');

    expect(first.props.accessibilityLabel).toBe(
      'Month 1, October 2026. Paid £700.00, interest £241.36, still owed £17,371.36',
    );
    expect(first.props.accessibilityHint).toBe('Shows how this month was worked out');
  });

  it('opens how a month was worked out', async () => {
    await renderApp('/schedule');

    await fireEvent.press(await screen.findByTestId('month-1'));

    expect(pathname()).toBe('/month/1');
  });

  it('says there is nothing to show with no debts', async () => {
    useScenarioStore.setState({ debts: [] });
    await renderApp('/schedule');

    expect(await screen.findByText('There is nothing to show. Add a debt first.')).toBeOnTheScreen();
  });
});

describe('how a month was worked out', () => {
  it('shows the interest sum for each debt, so it can be checked with a calculator', async () => {
    await renderApp('/month/1');

    expect(
      await screen.findByText('£950.00 × 39.9% ÷ 12 = £31.59 (rounded to the nearest penny)'),
    ).toBeOnTheScreen();
    expect(screen.getByText('£190.00 = £40.00 minimum + £150.00 extra')).toBeOnTheScreen();
    expect(screen.getByText('£950.00 + £31.59 − £190.00 = £791.59')).toBeOnTheScreen();
  });

  it('says where the extra went and why', async () => {
    await renderApp('/month/1');

    expect(
      await screen.findByText(
        'The extra goes here first: the highest interest rate of the debts still open (39.9%)',
      ),
    ).toBeOnTheScreen();
  });

  it('says what the budget is made of', async () => {
    await renderApp('/month/1');

    expect(
      await screen.findByText('£700.00 to spend = £550.00 of minimums across every debt + £150.00 extra'),
    ).toBeOnTheScreen();
  });

  it('marks a debt as cleared in the month it is, which for the overdraft is month 6', async () => {
    await renderApp('/month/5');
    expect(await screen.findByText('Overdraft')).toBeOnTheScreen();
    expect(screen.queryByText(/Overdraft · cleared this month/)).toBeNull();

    await renderApp('/month/6');
    expect(await screen.findByText('Overdraft · cleared this month')).toBeOnTheScreen();
  });

  it('moves to the month before and after', async () => {
    await renderApp('/month/3');

    await fireEvent.press(await screen.findByTestId('next'));
    expect(pathname()).toBe('/month/4');

    await fireEvent.press(screen.getByTestId('prev'));
    await fireEvent.press(screen.getByTestId('prev'));
    expect(pathname()).toBe('/month/2');
  });

  it('cannot go before the first month or after the last', async () => {
    await renderApp('/month/1');
    expect(await screen.findByTestId('prev')).toBeDisabled();

    await renderApp('/month/31');
    expect(await screen.findByTestId('next')).toBeDisabled();
  });

  it.each(['0', '32', '-3', 'abc', '2.7e9'])('says the month is not in the plan for %s', async (n) => {
    await renderApp(`/month/${n}`);

    expect(await screen.findByText('That month is not in the plan')).toBeOnTheScreen();
  });

  it('goes to the list from a message, even when opened straight from a link', async () => {
    await renderApp('/month/99');

    await fireEvent.press(await screen.findByRole('button', { name: 'Go back' }));

    expect(pathname()).toBe('/');
  });
});
