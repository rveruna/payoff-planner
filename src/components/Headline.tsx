import { STRATEGY_NAMES } from '../domain/colors';
import type { Comparison } from '../domain/engine';
import { formatPounds } from '../domain/money';
import { addMonths, formatDuration, formatMonth, type Month } from '../domain/months';
import type { Strategy } from '../domain/types';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

interface Props {
  strategy: Strategy;
  comparison: Comparison;
  start: Month;
  animate: boolean;
}

/** The answer: when the debts are cleared and what it costs, and what that saves against paying only the minimums. */
export function Headline({ strategy, comparison, start, animate }: Props) {
  const plan = comparison[strategy];
  const minimum = comparison.minimum;
  const shown = useAnimatedNumber(plan.interest, animate);

  if (plan.months.length === 0) {
    return (
      <section className="card headline" aria-label="Result">
        <p role="status">There are no debts to pay off.</p>
      </section>
    );
  }

  if (!plan.paidOff) {
    return (
      <section className="card headline warn" aria-label="Result">
        <p role="status" className="big">
          These payments never clear the debts
        </p>
        <p>
          With {STRATEGY_NAMES[strategy].toLowerCase()} the balance is still not paid off after 50 years.
          Raise the extra payment, or check that every minimum is more than a month&rsquo;s interest.
        </p>
      </section>
    );
  }

  const done = formatMonth(addMonths(start, plan.months.length - 1));
  const savedInterest = minimum.paidOff ? minimum.interest - plan.interest : null;
  const savedMonths = minimum.paidOff ? minimum.months.length - plan.months.length : null;

  return (
    <section className="card headline" aria-label="Result">
      <p role="status" className="big">
        <span className="small">Debt-free in</span> {done}
      </p>
      <p className="detail">
        after {formatDuration(plan.months.length)} of payments, with{' '}
        <strong>
          <span aria-hidden="true">{formatPounds(shown)}</span>
          <span className="visually-hidden">{formatPounds(plan.interest)}</span>
        </strong>{' '}
        paid in interest.
      </p>
      {strategy !== 'minimum' && (
        <p className="saving">
          {savedInterest !== null && savedMonths !== null
            ? `That is ${formatPounds(savedInterest)} less interest and ${formatDuration(savedMonths)} sooner than paying only the minimums.`
            : 'Paying only the minimums would never clear these debts.'}
        </p>
      )}
    </section>
  );
}
