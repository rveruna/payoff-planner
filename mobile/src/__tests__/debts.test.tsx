import { fireEvent, screen } from 'expo-router/testing-library';
import { MAX_DEBTS } from '@domain/scenario';
import { useScenarioStore } from '@/store/scenarioStore';
import { openTab, pathname, renderApp } from '@/test/render';
import { resetStore } from '@/test/helpers';

beforeEach(resetStore);

describe('the debts tab', () => {
  it('opens first, with the total owed and every debt', async () => {
    await renderApp();

    expect(await screen.findByText('You owe £17,830.00')).toBeOnTheScreen();
    for (const name of ['Store card', 'Credit card', 'Personal loan', 'Car finance', 'Overdraft']) {
      expect(screen.getByText(name)).toBeOnTheScreen();
    }
    expect(screen.getByText('29.9% APR · minimum £20.00 a month')).toBeOnTheScreen();
  });

  it('says plainly that the sample debts are invented', async () => {
    await renderApp();
    expect(await screen.findByText(/invented sample debts/)).toBeOnTheScreen();
  });

  it('describes each debt in one sentence for a screen reader, and says what tapping does', async () => {
    await renderApp();
    const row = await screen.findByLabelText(/^Overdraft, owes £950\.00 at 39\.9%, minimum £40\.00 a month$/);

    expect(row.props.accessibilityHint).toBe('Opens the debt to edit it');
    expect(row.props.accessibilityRole).toBe('button');
  });

  it('shows an empty state with no debts, and still offers to add one', async () => {
    useScenarioStore.setState({ debts: [] });
    await renderApp();

    expect(await screen.findByText('No debts yet')).toBeOnTheScreen();
    expect(screen.getByText('Add a debt to see how to pay it off.')).toBeOnTheScreen();
    expect(screen.getByTestId('add-debt')).toBeEnabled();
  });

  it('warns on a debt whose minimum is not more than a month’s interest', async () => {
    useScenarioStore.setState({
      debts: [{ id: 'x', name: 'Stuck', balance: 100_000, aprBp: 2400, minPayment: 1_000 }],
    });
    await renderApp();

    expect(await screen.findByText(/not more than a month’s interest \(£20\.00\)/)).toBeOnTheScreen();
  });

  it('does not warn when the minimum covers the interest', async () => {
    await renderApp();
    await screen.findByText('You owe £17,830.00');
    expect(screen.queryByText(/not more than a month’s interest/)).toBeNull();
  });

  it(`stops at ${MAX_DEBTS} debts, disables the button and says so`, async () => {
    useScenarioStore.setState({
      debts: Array.from({ length: MAX_DEBTS }, (_, i) => ({
        id: `d${i}`,
        name: `Debt ${i}`,
        balance: 1000,
        aprBp: 100,
        minPayment: 100,
      })),
    });
    await renderApp();

    expect(await screen.findByTestId('add-debt')).toBeDisabled();
    expect(screen.getByText(`You can add up to ${MAX_DEBTS} debts.`)).toBeOnTheScreen();
  });

  it('opens a debt to edit when it is tapped', async () => {
    await renderApp();

    await fireEvent.press(await screen.findByTestId('debt-d4'));

    expect(pathname()).toBe('/debt/d4');
    expect(await screen.findByDisplayValue('Overdraft')).toBeOnTheScreen();
  });

  it('opens a blank form from the add button', async () => {
    await renderApp();

    await fireEvent.press(await screen.findByTestId('add-debt'));

    expect(pathname()).toBe('/debt/new');
    expect(await screen.findByTestId('field-balance')).toBeOnTheScreen();
  });

  it('moves between the three tabs', async () => {
    await renderApp();
    await screen.findByText('You owe £17,830.00');

    await openTab('Plan');
    expect(pathname()).toBe('/plan');

    await openTab('Settings');
    expect(pathname()).toBe('/settings');

    await openTab('Debts');
    expect(pathname()).toBe('/');
  });
});
