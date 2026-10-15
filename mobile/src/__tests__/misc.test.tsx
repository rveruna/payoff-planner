import { fireEvent, screen } from 'expo-router/testing-library';
import { useScenarioStore } from '@/store/scenarioStore';
import { pathname, renderApp } from '@/test/render';
import { resetStore } from '@/test/helpers';

beforeEach(resetStore);

describe('an address that does not exist', () => {
  it('says so, and offers a way home', async () => {
    await renderApp('/nowhere/at/all');

    expect(await screen.findByText('That page does not exist')).toBeOnTheScreen();
    expect(screen.getByText('The link may be old or mistyped.')).toBeOnTheScreen();
  });

  it('goes to the debts from the link', async () => {
    await renderApp('/nowhere');

    await fireEvent.press(await screen.findByText('Go to your debts'));

    expect(pathname()).toBe('/');
    expect(await screen.findByText('You owe £17,830.00')).toBeOnTheScreen();
  });
});

describe('dragging a finger across a chart', () => {
  // a chart is 360 points wide here, with 52 points of axis on the left and 8 on the right
  const WIDTH = 360;
  const PLOT = WIDTH - 52 - 8;
  const at = (month: number, span: number) => 52 + (PLOT * month) / span;

  const sizeIt = async (chart: ReturnType<typeof screen.getAllByTestId>[number]) =>
    fireEvent(chart, 'layout', { nativeEvent: { layout: { width: WIDTH, height: 240 } } });
  const touch = async (chart: ReturnType<typeof screen.getAllByTestId>[number], locationX: number) =>
    fireEvent(chart, 'responderGrant', { nativeEvent: { locationX } });

  it('chooses the month under the finger', async () => {
    await renderApp('/plan');
    await screen.findByText('April 2029');
    const [race] = screen.getAllByTestId('chart');
    await sizeIt(race!);

    // the race chart is drawn over 92 months for the sample plans
    await touch(race!, at(10, 92));

    expect(screen.getByTestId('month-label')).toHaveTextContent(/^Month 10 ·/);
  });

  it('follows the finger as it moves', async () => {
    await renderApp('/plan');
    await screen.findByText('April 2029');
    const [race] = screen.getAllByTestId('chart');
    await sizeIt(race!);

    await fireEvent(race!, 'responderMove', { nativeEvent: { locationX: at(20, 92) } });

    expect(screen.getByTestId('month-label')).toHaveTextContent(/^Month 20 ·/);
  });

  it('never goes past the last month of the plan, or before the first', async () => {
    await renderApp('/plan');
    await screen.findByText('April 2029');
    const [, stack] = screen.getAllByTestId('chart');
    await sizeIt(stack!);

    await touch(stack!, WIDTH + 100);
    expect(screen.getByTestId('month-label')).toHaveTextContent(/^Month 31 ·/);

    await touch(stack!, 0);
    expect(screen.getByTestId('month-label')).toHaveTextContent(/^Month 1 ·/);
  });

  it('ignores a touch before the chart has a size', async () => {
    await renderApp('/plan');
    await screen.findByText('April 2029');
    const [race] = screen.getAllByTestId('chart');

    await touch(race!, 150);

    expect(screen.getByTestId('month-label')).toHaveTextContent(/^Month 1 ·/);
  });

  it('lists a debt that never clears as never cleared', async () => {
    useScenarioStore.setState({
      debts: [
        { id: 'a', name: 'Stuck', balance: 100_000, aprBp: 2400, minPayment: 1_000 },
        { id: 'b', name: 'Fine', balance: 10_000, aprBp: 0, minPayment: 10_000 },
      ],
      extra: 0,
      strategy: 'minimum',
    });
    await renderApp('/plan');

    expect(await screen.findByText(/Stuck/)).toBeOnTheScreen();
    expect(screen.getAllByText(/never cleared/).length).toBeGreaterThan(0);
  });
});
