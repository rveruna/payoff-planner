import { useId } from 'react';
import { STRATEGY_COLORS, STRATEGY_NAMES } from '../domain/colors';
import type { Comparison } from '../domain/engine';
import { formatDuration, formatMonth, addMonths, type Month } from '../domain/months';
import { formatPounds } from '../domain/money';
import { STRATEGIES, type Strategy } from '../domain/types';

interface Props {
  value: Strategy;
  comparison: Comparison;
  start: Month;
  onChange: (strategy: Strategy) => void;
}

const DESCRIPTIONS: Record<Strategy, string> = {
  avalanche: 'The extra goes to the highest interest rate first. It costs the least interest.',
  snowball:
    'The extra goes to the smallest balance first. Smaller debts clear sooner, which some people find motivating.',
  minimum: 'Only the minimums are paid. Nothing rolls on when a debt is cleared, and your extra is not used.',
};

export function StrategyCards({ value, comparison, start, onChange }: Props) {
  const name = useId();
  const best = Math.min(
    ...STRATEGIES.filter((s) => comparison[s].paidOff).map((s) => comparison[s].interest),
  );

  return (
    <fieldset className="strategies">
      <legend>How to pay them off</legend>
      <div className="cards">
        {STRATEGIES.map((strategy) => {
          const plan = comparison[strategy];
          const selected = strategy === value;
          return (
            <label
              key={strategy}
              className={selected ? 'strategy selected' : 'strategy'}
              style={{ borderTopColor: STRATEGY_COLORS[strategy] }}
            >
              <input type="radio" name={name} checked={selected} onChange={() => onChange(strategy)} />
              <span className="title">
                {STRATEGY_NAMES[strategy]}
                {selected && <span className="tick"> · chosen</span>}
              </span>
              <span className="desc">{DESCRIPTIONS[strategy]}</span>
              <span className="outcome">
                {plan.months.length === 0 ? (
                  'Nothing to pay'
                ) : plan.paidOff ? (
                  <>
                    <strong>{formatMonth(addMonths(start, plan.months.length - 1))}</strong>
                    <span>
                      {formatDuration(plan.months.length)}, {formatPounds(plan.interest)} interest
                      {plan.interest === best && strategy !== 'minimum' ? ' (the least)' : ''}
                    </span>
                  </>
                ) : (
                  <strong>Never clears the debts</strong>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
