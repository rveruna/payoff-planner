import { fireEvent, screen } from 'expo-router/testing-library';
import { useScenarioStore } from '@/store/scenarioStore';
import { pathname, renderApp } from '@/test/render';
import { resetStore } from '@/test/helpers';

beforeEach(resetStore);

const store = () => useScenarioStore.getState();
const LINK = '/import?d=Loan~250000~800~9000&d=Card~100000~2400~5000&x=3000&s=snowball';

describe('importing a shared plan', () => {
  it('shows what is in the link before anything is replaced', async () => {
    await renderApp(LINK);

    expect(await screen.findByText('Use this plan?')).toBeOnTheScreen();
    expect(
      screen.getByText(/2 debts totalling £3,500\.00, with £30\.00 extra a month, paid with snowball\./),
    ).toBeOnTheScreen();
    expect(screen.getByText('Loan: £2,500.00')).toBeOnTheScreen();
    expect(screen.getByText('Card: £1,000.00')).toBeOnTheScreen();
    expect(store().debts).toHaveLength(5);
  });

  it('warns that it replaces the debts you have', async () => {
    await renderApp(LINK);
    expect(
      await screen.findByText('Using it replaces the debts you have now. This cannot be undone.'),
    ).toBeOnTheScreen();
  });

  it('replaces the debts, the extra and the strategy when confirmed, and shows the plan', async () => {
    await renderApp(LINK);

    await fireEvent.press(await screen.findByTestId('confirm-import'));

    expect(store().debts.map((d) => d.name)).toEqual(['Loan', 'Card']);
    expect([store().extra, store().strategy]).toEqual([3_000, 'snowball']);
    expect(pathname()).toBe('/plan');
  });

  it('changes nothing when cancelled, even when opened straight from a link', async () => {
    await renderApp(LINK);

    await fireEvent.press(await screen.findByRole('button', { name: 'Cancel' }));

    expect(store().debts).toHaveLength(5);
    expect(pathname()).toBe('/');
  });

  it('skips a debt that cannot be read and offers the ones that can', async () => {
    await renderApp('/import?d=Bad~lots~1~1&d=Good~100000~2400~5000');

    expect(await screen.findByText(/1 debt totalling £1,000\.00/)).toBeOnTheScreen();
  });

  it.each([
    ['/import', 'no plan at all'],
    ['/import?d=junk&d=more~junk', 'debts that cannot be read'],
  ])('says there is nothing to import for %s (%s) and offers no way to wipe the debts', async (url) => {
    await renderApp(url);

    expect(await screen.findByText('Nothing to import')).toBeOnTheScreen();
    expect(screen.queryByTestId('confirm-import')).toBeNull();
    expect(store().debts).toHaveLength(5);
  });

  it('treats a link with no debts in it as the sample debts with the choices it does have, as the web version does', async () => {
    await renderApp('/import?s=snowball&x=0');

    expect(
      await screen.findByText(/5 debts totalling £17,830\.00, with £0\.00 extra a month, paid with snowball/),
    ).toBeOnTheScreen();
  });

  it('treats a name that looks like markup as plain text', async () => {
    await renderApp('/import?d=%3Cb%3EBold%3C%2Fb%3E~100000~2400~5000');

    expect(await screen.findByText('<b>Bold</b>: £1,000.00')).toBeOnTheScreen();
  });
});
