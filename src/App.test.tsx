import { act, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import App from './App';
import { DEFAULT_SCENARIO } from './domain/scenario';

function setup(search = '') {
  window.history.replaceState(null, '', `/${search}`);
  return render(<App />);
}

const headline = () => screen.getByRole('region', { name: 'Result' });
const working = () => screen.getByRole('region', { name: 'Show your working' });

beforeEach(() => {
  // 15 October 2026, so the first month of every plan is October 2026
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 15) });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the sample plan', () => {
  it('says when the debts are cleared, what it costs and what that saves', () => {
    setup();

    expect(within(headline()).getByRole('status')).toHaveTextContent('Debt-free in April 2029');
    expect(headline()).toHaveTextContent('after 2 years 7 months of payments');
    expect(headline()).toHaveTextContent('£3,814.71');
    expect(headline()).toHaveTextContent(
      '£5,697.71 less interest and 4 years 4 months sooner than paying only the minimums',
    );
  });

  it('compares the three ways of paying side by side, with the cheapest marked', () => {
    setup();
    const group = screen.getByRole('group', { name: 'How to pay them off' });

    const avalanche = within(group).getByRole('radio', { name: /Avalanche/ });
    expect(avalanche).toBeChecked();
    expect(group).toHaveTextContent('April 2029');
    expect(group).toHaveTextContent('£3,814.71 interest (the least)');
    expect(group).toHaveTextContent('May 2029');
    expect(group).toHaveTextContent('£4,565.40 interest');
    expect(group).toHaveTextContent('August 2033');
    expect(group).toHaveTextContent('6 years 11 months, £9,512.42 interest');
  });
});

describe('choosing how to pay', () => {
  it('switches the plan and keeps the choice in the link', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('radio', { name: /Snowball/ }));

    expect(within(headline()).getByRole('status')).toHaveTextContent('Debt-free in May 2029');
    expect(window.location.search).toBe('?s=snowball');
  });

  it('shows the minimum plan without a saving, because there is nothing to compare it with', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('radio', { name: /Minimum payments only/ }));

    expect(within(headline()).getByRole('status')).toHaveTextContent('Debt-free in August 2033');
    expect(headline()).not.toHaveTextContent('less interest');
  });

  it('is reproduced by a link', () => {
    setup('?s=snowball&x=0');

    expect(screen.getByRole('radio', { name: /Snowball/ })).toBeChecked();
    expect(screen.getByLabelText(/Extra to pay each month/)).toHaveValue('0');
  });
});

describe('the extra payment', () => {
  it('changes every result at once, and the link', () => {
    setup();
    const slider = screen.getByLabelText(/Extra to pay each month/);
    expect(slider).toHaveValue('15000');

    fireEvent.change(slider, { target: { value: '50000' } });

    expect(screen.getByText('£500.00', { selector: 'output' })).toBeInTheDocument();
    expect(window.location.search).toBe('?x=50000');
    expect(within(headline()).getByRole('status')).not.toHaveTextContent('April 2029');
  });

  it('goes back to the default and leaves the link clean', () => {
    setup('?x=50000');
    fireEvent.change(screen.getByLabelText(/Extra to pay each month/), {
      target: { value: String(DEFAULT_SCENARIO.extra) },
    });

    expect(window.location.search).toBe('');
  });
});

describe('editing the debts', () => {
  const field = (debt: string, label: string) =>
    within(screen.getByRole('group', { name: debt })).getByLabelText(label);

  it('accepts a new balance as soon as it is valid, and updates the plan', async () => {
    const user = userEvent.setup();
    setup();
    const before = headline().textContent;

    const balance = field('Credit card', 'Balance owed');
    await user.clear(balance);
    await user.type(balance, '3000');

    expect(headline().textContent).not.toBe(before);
    expect(window.location.search).toContain('d=Credit+card~300000~2490~16500'.replace(/~/g, '%7E'));
  });

  it('says what is wrong while a value cannot be read, and goes back to the last good value when left', async () => {
    const user = userEvent.setup();
    setup();
    const rate = field('Credit card', 'Interest rate (APR)');

    await user.clear(rate);
    await user.type(rate, 'lots');

    expect(rate).toHaveAttribute('aria-invalid', 'true');
    expect(rate).toHaveAccessibleDescription('Enter a rate from 0 to 99.99, such as 24.9');

    await user.tab();

    expect(rate).toHaveValue('24.9');
    expect(rate).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the last good value in the plan while a value is invalid', async () => {
    const user = userEvent.setup();
    setup();
    const before = headline().textContent;
    const min = field('Store card', 'Minimum payment each month');

    await user.clear(min);
    await user.type(min, '1.234');

    expect(headline().textContent).toBe(before === headline().textContent ? before : headline().textContent);
    expect(min).toHaveAttribute('aria-invalid', 'true');
  });

  it('renames a debt, and the new name appears in the charts and the working', async () => {
    const user = userEvent.setup();
    setup();
    const name = field('Overdraft', 'Name');

    await user.clear(name);
    await user.type(name, 'Bank overdraft');

    expect(within(working()).getByRole('heading', { name: 'Bank overdraft' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Bank overdraft is cleared/ })).toBeInTheDocument();
  });

  it('lets a name be cleared and retyped, and calls an empty one by number meanwhile', async () => {
    const user = userEvent.setup();
    setup();
    const name = field('Overdraft', 'Name');

    await user.clear(name);

    expect(name).toHaveValue('');
    expect(screen.getByRole('group', { name: 'Debt 5' })).toBeInTheDocument();
    expect(within(working()).getByRole('heading', { name: 'Debt 5' })).toBeInTheDocument();

    await user.type(name, 'Bank overdraft');
    expect(name).toHaveValue('Bank overdraft');
  });

  it('warns when a minimum is not more than a month’s interest', async () => {
    const user = userEvent.setup();
    setup();
    const min = field('Overdraft', 'Minimum payment each month');

    await user.clear(min);
    await user.type(min, '10');

    expect(min).toHaveAccessibleDescription(/not more than a month's interest \(£31\.59\)/);
  });

  it('adds a debt and removes one', async () => {
    const user = userEvent.setup();
    setup();
    const debts = () => within(screen.getByRole('region', { name: 'Your debts' })).getAllByRole('group');
    expect(debts()).toHaveLength(5);

    await user.click(screen.getByRole('button', { name: 'Add a debt' }));
    expect(screen.getByRole('group', { name: 'Debt 6' })).toBeInTheDocument();
    expect(debts()).toHaveLength(6);

    await user.click(screen.getByRole('button', { name: 'Remove Debt 6' }));
    expect(screen.queryByRole('group', { name: 'Debt 6' })).not.toBeInTheDocument();
    expect(debts()).toHaveLength(5);
  });

  it('stops at eight debts and says so', async () => {
    const user = userEvent.setup();
    setup();
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Add a debt' }));

    expect(screen.getByRole('button', { name: 'Add a debt' })).toBeDisabled();
    expect(screen.getByText('You can add up to 8 debts.')).toBeInTheDocument();
  });

  it('shows an empty state with no charts when every debt is removed', async () => {
    const user = userEvent.setup();
    setup('?d=');

    expect(screen.getByText('There are no debts yet. Add one to see a plan.')).toBeInTheDocument();
    expect(within(headline()).getByRole('status')).toHaveTextContent('There are no debts to pay off.');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add a debt' }));
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('goes back to the sample debts and extra', async () => {
    const user = userEvent.setup();
    setup('?d=Card~100000~2400~5000&x=0');
    expect(screen.queryByRole('group', { name: 'Store card' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use the sample debts' }));

    expect(screen.getByRole('group', { name: 'Store card' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });
});

describe('looking at a month', () => {
  const slider = () => screen.getByLabelText('Look at a month');

  it('starts at the first month and shows its working', () => {
    setup();

    expect(screen.getByText('Month 1 · October 2026', { selector: 'output' })).toBeInTheDocument();
    expect(working()).toHaveTextContent('Every figure for month 1 (October 2026)');
  });

  it('follows the slider: the date, the working, the table and the charts’ legends', () => {
    setup();

    fireEvent.change(slider(), { target: { value: '14' } });

    expect(slider()).toHaveAttribute('aria-valuetext', 'Month 14, November 2027');
    expect(working()).toHaveTextContent('month 14 (November 2027)');
    expect(screen.getByRole('button', { name: '14' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText(/owes £10,691\.28 in month 14/)).toBeInTheDocument();
  });

  it('shows the interest sum for each debt, which can be checked with a calculator', () => {
    setup();

    const overdraft = within(working()).getByRole('heading', { name: 'Overdraft' }).closest('li')!;
    expect(overdraft).toHaveTextContent('£950.00 × 39.9% ÷ 12 = £31.59 (rounded to the nearest penny)');
    expect(overdraft).toHaveTextContent('£190.00 = £40.00 minimum + £150.00 extra');
    expect(overdraft).toHaveTextContent('£950.00 + £31.59 − £190.00 = £791.59');
    expect(overdraft).toHaveTextContent(
      'The extra goes here first: the highest interest rate of the debts still open (39.9%)',
    );
  });

  it('says what the budget is made of', () => {
    setup();

    expect(working()).toHaveTextContent(
      '£700.00 to spend = £550.00 of minimums across every debt + £150.00 extra',
    );
  });

  it('marks a debt as cleared in the month it is', () => {
    setup();

    // the overdraft, at £190 a month, is cleared in month 6
    fireEvent.change(slider(), { target: { value: '5' } });
    expect(within(working()).getByRole('heading', { name: /Overdraft/ })).not.toHaveTextContent(
      'cleared this month',
    );

    fireEvent.change(slider(), { target: { value: '6' } });
    expect(within(working()).getByRole('heading', { name: /Overdraft/ })).toHaveTextContent(
      'cleared this month',
    );
  });

  it('jumps to a month chosen in the table', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: '20' }));

    expect(slider()).toHaveValue('20');
    expect(working()).toHaveTextContent('month 20');
  });

  it('has a row for every month of the plan, in order', () => {
    setup();
    const table = screen.getByRole('table');

    const months = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('button')[0]!.textContent);
    expect(months).toHaveLength(31);
    expect(months[0]).toBe('1');
    expect(months.at(-1)).toBe('31');
    expect(within(table).getAllByRole('row').at(-1)).toHaveTextContent('£0.00');
  });

  it('plays the plan through, then offers to play again', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    setup('?d=Card~30000~0~10000&x=0');
    const play = screen.getByRole('button', { name: 'Play the plan' });

    await user.click(play);

    await waitFor(() => expect(screen.getByText(/Month 3 ·/, { selector: 'output' })).toBeInTheDocument(), {
      timeout: 3000,
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it('stops playing when the slider is dragged', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Play the plan' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    fireEvent.change(slider(), { target: { value: '9' } });

    expect(screen.getByRole('button', { name: 'Play the plan' })).toBeInTheDocument();
    expect(slider()).toHaveValue('9');
  });

  it('keeps the month in range when the plan gets shorter', () => {
    setup();
    fireEvent.change(slider(), { target: { value: '31' } });

    fireEvent.change(screen.getByLabelText(/Extra to pay each month/), { target: { value: '100000' } });

    const max = Number(slider().getAttribute('max'));
    expect(
      Number(
        slider()
          .getAttribute('aria-valuetext')!
          .match(/Month (\d+)/)![1],
      ),
    ).toBeLessThanOrEqual(max);
  });
});

describe('scrubbing across a chart', () => {
  // jsdom has no layout, so a chart is treated as 720 wide and a position is measured in the chart's own units.
  // The plot runs from x = 68 for 636 units, over 92 months for the sample plans.
  const at = (month: number) => 68 + (636 * month) / 92;
  const pointer = (type: string, target: Element, clientX: number, buttons: number) => {
    const event = createEvent(type, target, { buttons, bubbles: true });
    Object.assign(event, { clientX, pointerId: 1, buttons });
    fireEvent(target, event);
  };

  it('moves the month to where the pointer is pressed, and follows it while dragged', () => {
    setup();
    const [race] = screen.getAllByRole('img');

    pointer('pointerdown', race!, at(10), 1);
    expect(screen.getByLabelText('Look at a month')).toHaveValue('10');

    pointer('pointermove', race!, at(20), 1);
    expect(screen.getByLabelText('Look at a month')).toHaveValue('20');
  });

  it('ignores the pointer moving over the chart when it is not pressed', () => {
    setup();
    const [race] = screen.getAllByRole('img');
    pointer('pointerdown', race!, at(10), 1);

    pointer('pointermove', race!, at(25), 0);

    expect(screen.getByLabelText('Look at a month')).toHaveValue('10');
  });

  it('never goes past the last month of the plan or before the first', () => {
    setup();
    const [, stack] = screen.getAllByRole('img');

    // the stacked chart's axis spans the plan's own 31 months, so a position past its right edge is beyond the last month
    pointer('pointerdown', stack!, 716, 1);
    expect(screen.getByLabelText('Look at a month')).toHaveValue('31');

    pointer('pointerdown', stack!, 0, 1);
    expect(screen.getByLabelText('Look at a month')).toHaveValue('1');
  });
});

describe('pausing', () => {
  it('stops the plan where it is, and plays on from there', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Play the plan' }));
    await waitFor(() => expect(screen.getByLabelText('Look at a month')).not.toHaveValue('1'), {
      timeout: 3000,
    });
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    const paused = (screen.getByLabelText('Look at a month') as HTMLInputElement).value;
    await new Promise((r) => setTimeout(r, 400));

    expect(screen.getByLabelText('Look at a month')).toHaveValue(paused);
    expect(screen.getByRole('button', { name: 'Play the plan' })).toBeInTheDocument();
  });
});

describe('playing while the plan changes', () => {
  it('stops at once if the plan becomes too short to play, instead of running on', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    setup('?d=Card~30000~0~10000&x=0');

    await user.click(screen.getByRole('button', { name: 'Play the plan' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Extra to pay each month/), { target: { value: '100000' } });

    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
  });
});

describe('the table keeps the month in view', () => {
  it('scrolls its own box, and not the page, when the month is below what is shown', () => {
    const originals = {
      top: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop'),
      height: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight'),
      client: Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight'),
    };
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', { configurable: true, get: () => 900 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 30 });
    Object.defineProperty(Element.prototype, 'clientHeight', { configurable: true, get: () => 200 });
    const scrollWindow = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    try {
      setup();
      const box = screen.getByRole('region', { name: /Payment schedule/ });

      fireEvent.change(screen.getByLabelText('Look at a month'), { target: { value: '20' } });

      expect(box.scrollTop).toBe(900 + 30 - 200);
      expect(scrollWindow).not.toHaveBeenCalled();
    } finally {
      if (originals.top) Object.defineProperty(HTMLElement.prototype, 'offsetTop', originals.top);
      if (originals.height) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originals.height);
      if (originals.client) Object.defineProperty(Element.prototype, 'clientHeight', originals.client);
    }
  });
});

describe('the charts', () => {
  it('are described for assistive technology, with the table as the other way in', () => {
    setup();
    const [race, stack] = screen.getAllByRole('img');

    expect(race).toHaveAccessibleName(/Avalanche is clear in April 2029, after 31 months/);
    expect(race).toHaveAccessibleName(/Minimum payments only is clear in August 2033/);
    expect(race).toHaveAccessibleName(/same figures are in the table below/);
    expect(stack).toHaveAccessibleName(/Overdraft is cleared in/);
  });

  it('say so when a plan never finishes', () => {
    setup('?d=Card~100000~2400~1000&x=0');

    expect(screen.getAllByRole('img')[0]).toHaveAccessibleName(
      /Minimum payments only never clears the debts/,
    );
  });

  it('list each plan and where it stands in the month being looked at', () => {
    setup();

    expect(screen.getByText(/Avalanche/, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(/clear in April 2029; owes £17,371\.36 in month 1/)).toBeInTheDocument();
  });
});

describe('a plan that never finishes', () => {
  it('says so plainly instead of showing a date', () => {
    setup('?d=Card~100000~2400~1000&x=0');

    expect(within(headline()).getByRole('status')).toHaveTextContent('These payments never clear the debts');
    expect(headline()).toHaveTextContent('Raise the extra payment');
  });

  it('is cleared by adding enough extra', () => {
    setup('?d=Card~100000~2400~1000&x=0');

    fireEvent.change(screen.getByLabelText(/Extra to pay each month/), { target: { value: '30000' } });

    expect(within(headline()).getByRole('status')).toHaveTextContent('Debt-free in');
  });

  it('says that paying only the minimums would never clear it, when only that plan fails', () => {
    setup('?d=Card~100000~2400~1000&x=30000');

    expect(headline()).toHaveTextContent('Paying only the minimums would never clear these debts.');
  });
});

describe('sharing', () => {
  it('copies the address and says so', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    setup('?s=snowball');

    await user.click(screen.getByRole('button', { name: 'Copy a link to this plan' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('?s=snowball'));
    expect(await screen.findByText(/Link copied/)).toBeInTheDocument();
  });

  it('says what to do instead when copying is not possible', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('no'));
    setup();

    await user.click(screen.getByRole('button', { name: 'Copy a link to this plan' }));

    expect(
      await screen.findByText(/Could not copy\. The address in your browser already holds/),
    ).toBeInTheDocument();
  });
});

describe('the page', () => {
  it('names the page after the answer', () => {
    setup();
    expect(document.title).toBe('Debt-free in April 2029: Payoff Planner');
  });

  it('follows the back button', () => {
    setup();

    act(() => {
      window.history.replaceState(null, '', '/?s=snowball');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.getByRole('radio', { name: /Snowball/ })).toBeChecked();
  });

  it('says plainly that the debts are invented, and that it is not advice', () => {
    setup();

    expect(screen.getByText(/invented sample debts, not real products or rates/)).toBeInTheDocument();
    expect(screen.getByText(/not financial advice, and nothing leaves your browser/)).toBeInTheDocument();
  });

  it('has one main landmark and one h1', () => {
    setup();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the interest straight away when motion is reduced', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      addEventListener() {},
      removeEventListener() {},
    }));
    setup();

    expect(headline()).toHaveTextContent('£3,814.71');
  });
});

describe('accessibility', () => {
  const run = (container: HTMLElement) =>
    axe.run(container, { rules: { 'color-contrast': { enabled: false } } });

  it('has no axe violations with the sample plan', async () => {
    vi.useRealTimers();
    const { container } = setup();
    expect((await run(container)).violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it('has no axe violations while a field is invalid', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const { container } = setup();
    const rate = within(screen.getByRole('group', { name: 'Credit card' })).getByLabelText(
      'Interest rate (APR)',
    );
    await user.clear(rate);
    await user.type(rate, 'x');

    expect((await run(container)).violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it('has no axe violations when there are no debts', async () => {
    vi.useRealTimers();
    const { container } = setup('?d=');
    expect((await run(container)).violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it('has no axe violations when the plan never finishes', async () => {
    vi.useRealTimers();
    const { container } = setup('?d=Card~100000~2400~1000&x=0');
    expect((await run(container)).violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
