import { fireEvent, screen } from 'expo-router/testing-library';
import { useScenarioStore } from '@/store/scenarioStore';
import { pathname, renderApp } from '@/test/render';
import { resetStore } from '@/test/helpers';

beforeEach(resetStore);

const fill = async (testID: string, text: string) =>
  fireEvent.changeText(await screen.findByTestId(testID), text);
const debts = () => useScenarioStore.getState().debts;

describe('adding a debt', () => {
  it('starts with empty fields and a save button that cannot be pressed yet', async () => {
    await renderApp('/debt/new');

    expect(await screen.findByTestId('field-balance')).toHaveProp('value', '');
    expect(screen.getByTestId('save-debt')).toBeDisabled();
    expect(screen.queryByTestId('delete-debt')).toBeNull();
  });

  it('can be saved once every field is valid, and adds the debt to the list', async () => {
    await renderApp('/debt/new');

    await fill('field-name', 'Catalogue');
    await fill('field-balance', '1,250.50');
    await fill('field-apr', '19.9');
    await fill('field-minimum', '45');
    await fireEvent.press(screen.getByTestId('save-debt'));

    const added = debts().at(-1)!;
    expect(added).toMatchObject({ name: 'Catalogue', balance: 125_050, aprBp: 1990, minPayment: 4_500 });
    expect(debts()).toHaveLength(6);
    expect(pathname()).toBe('/');
    expect(await screen.findByText('You owe £19,080.50')).toBeOnTheScreen();
  });

  it('trims the name, and allows no name at all, which is then shown as a numbered debt', async () => {
    await renderApp('/debt/new');

    await fill('field-name', '   ');
    await fill('field-balance', '100');
    await fill('field-apr', '10');
    await fill('field-minimum', '10');
    await fireEvent.press(screen.getByTestId('save-debt'));

    expect(debts().at(-1)!.name).toBe('');
    expect(await screen.findByText('Debt 6')).toBeOnTheScreen();
  });

  it.each([
    ['field-balance', '0', 'Enter an amount above £0, such as 1,250.50'],
    ['field-balance', 'lots', 'Enter an amount above £0, such as 1,250.50'],
    ['field-balance', '10.999', 'Enter an amount above £0, such as 1,250.50'],
    ['field-apr', '100', 'Enter a rate from 0 to 99.99, such as 24.9'],
    ['field-apr', 'x', 'Enter a rate from 0 to 99.99, such as 24.9'],
    ['field-minimum', '-5', 'Enter an amount such as 75'],
    ['field-minimum', '1e3', 'Enter an amount such as 75'],
  ])('says what is wrong with %s = %j', async (testID, value, message) => {
    await renderApp('/debt/new');

    await fill(testID, value);

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(screen.getByTestId(testID)).toHaveProp('aria-invalid', true);
    expect(screen.getByTestId('save-debt')).toBeDisabled();
  });

  it('announces an error as an alert', async () => {
    await renderApp('/debt/new');
    await fill('field-apr', 'x');

    const error = await screen.findByText('Enter a rate from 0 to 99.99, such as 24.9');

    expect(error.props.accessibilityRole).toBe('alert');
  });

  it('refuses a name longer than 30 characters', async () => {
    await renderApp('/debt/new');

    await fill('field-name', 'x'.repeat(31));

    expect(await screen.findByText('Use 30 characters or fewer')).toBeOnTheScreen();
  });

  it('warns while typing that a minimum is not more than a month’s interest, and clears the warning when it is', async () => {
    await renderApp('/debt/new');
    await fill('field-balance', '1000');
    await fill('field-apr', '24');

    await fill('field-minimum', '10');
    expect(await screen.findByText(/not more than a month's interest \(£20\.00\)/)).toBeOnTheScreen();

    await fill('field-minimum', '50');
    expect(screen.queryByText(/not more than a month's interest/)).toBeNull();
  });

  it('goes to the list when cancelled even if it was opened straight from a link, with no screen behind it', async () => {
    await renderApp('/debt/new');
    expect(pathname()).toBe('/debt/new');

    await fireEvent.press(await screen.findByRole('button', { name: 'Cancel' }));

    expect(pathname()).toBe('/');
  });

  it('does not add anything when cancelled', async () => {
    await renderApp('/debt/new');
    await fill('field-balance', '100');

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(debts()).toHaveLength(5);
    expect(pathname()).toBe('/');
  });
});

describe('editing a debt', () => {
  it('shows what is saved, with the money as plain amounts', async () => {
    await renderApp('/debt/d1');

    expect(await screen.findByTestId('field-name')).toHaveProp('value', 'Credit card');
    expect(screen.getByTestId('field-balance')).toHaveProp('value', '6,500.00');
    expect(screen.getByTestId('field-apr')).toHaveProp('value', '24.9');
    expect(screen.getByTestId('field-minimum')).toHaveProp('value', '165.00');
    expect(screen.getByTestId('save-debt')).toBeEnabled();
  });

  it('saves a change to only that debt', async () => {
    await renderApp('/debt/d1');

    await fill('field-balance', '5000');
    await fireEvent.press(screen.getByTestId('save-debt'));

    expect(debts()[1]).toMatchObject({ id: 'd1', balance: 500_000, name: 'Credit card' });
    expect(debts()[0]!.balance).toBe(48_000);
    expect(await screen.findByText('You owe £16,330.00')).toBeOnTheScreen();
  });

  it('asks twice before deleting', async () => {
    await renderApp('/debt/d4');

    await fireEvent.press(await screen.findByTestId('delete-debt'));
    expect(debts()).toHaveLength(5);

    await fireEvent.press(screen.getByTestId('confirm-delete'));

    expect(debts().find((d) => d.id === 'd4')).toBeUndefined();
    expect(pathname()).toBe('/');
    expect(await screen.findByText('You owe £16,880.00')).toBeOnTheScreen();
  });

  it('says so, and offers a way back, when the debt is not there', async () => {
    await renderApp('/debt/nope');

    expect(await screen.findByText('That debt is not here')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeOnTheScreen();
  });
});
