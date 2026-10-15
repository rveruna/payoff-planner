import { useId } from 'react';
import { formatPercent, formatPounds, monthlyInterest, parsePercent, parsePounds } from '../domain/money';
import { MAX_DEBTS, MAX_NAME, displayName } from '../domain/scenario';
import type { Debt } from '../domain/types';
import { ParsedField } from './ParsedField';

interface Props {
  debts: Debt[];
  onChange: (debts: Debt[]) => void;
  onUseSample: () => void;
}

const formatAmount = (pence: number) => formatPounds(pence).replace('£', '');

export function DebtEditor({ debts, onChange, onUseSample }: Props) {
  const headingId = useId();
  const change = (index: number, patch: Partial<Debt>) =>
    onChange(debts.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  return (
    <section aria-labelledby={headingId} className="card">
      <div className="card-head">
        <h2 id={headingId}>Your debts</h2>
        <button type="button" className="quiet" onClick={onUseSample}>
          Use the sample debts
        </button>
      </div>
      <p className="note">
        These are invented sample debts, not real products or rates. Change them to your own, or add more.
      </p>

      <ul className="debts">
        {debts.map((debt, index) => {
          const interest = monthlyInterest(debt.balance, debt.aprBp);
          const stuck = debt.balance > 0 && debt.minPayment <= interest;
          return (
            <li key={debt.id}>
              <fieldset>
                <legend>{displayName(debt, index)}</legend>
                <div className="field">
                  <label htmlFor={`${headingId}-name-${index}`}>Name</label>
                  <input
                    id={`${headingId}-name-${index}`}
                    type="text"
                    maxLength={MAX_NAME}
                    value={debt.name}
                    onChange={(e) => change(index, { name: e.target.value })}
                  />
                  <p className="note" />
                </div>
                <ParsedField
                  label="Balance owed"
                  prefix="£"
                  value={debt.balance}
                  parse={parsePounds}
                  format={formatAmount}
                  onCommit={(balance) => change(index, { balance })}
                  problem="Enter an amount such as 1,250.50"
                />
                <ParsedField
                  label="Interest rate (APR)"
                  suffix="%"
                  value={debt.aprBp}
                  parse={parsePercent}
                  format={(bp) => formatPercent(bp).replace('%', '')}
                  onCommit={(aprBp) => change(index, { aprBp })}
                  problem="Enter a rate from 0 to 99.99, such as 24.9"
                />
                <ParsedField
                  label="Minimum payment each month"
                  prefix="£"
                  value={debt.minPayment}
                  parse={parsePounds}
                  format={formatAmount}
                  onCommit={(minPayment) => change(index, { minPayment })}
                  problem="Enter an amount such as 75"
                  note={
                    stuck
                      ? `This is not more than a month's interest (${formatPounds(interest)}), so paying only this, the debt would not shrink.`
                      : null
                  }
                />
                <button
                  type="button"
                  className="quiet remove"
                  onClick={() => onChange(debts.filter((_, i) => i !== index))}
                  aria-label={`Remove ${displayName(debt, index)}`}
                >
                  Remove
                </button>
              </fieldset>
            </li>
          );
        })}
      </ul>

      {debts.length === 0 && <p className="empty">There are no debts yet. Add one to see a plan.</p>}
      <button
        type="button"
        disabled={debts.length >= MAX_DEBTS}
        onClick={() =>
          onChange([
            ...debts,
            {
              id: `d${debts.length}`,
              name: `Debt ${debts.length + 1}`,
              balance: 100_000,
              aprBp: 1990,
              minPayment: 5_000,
            },
          ])
        }
      >
        Add a debt
      </button>
      {debts.length >= MAX_DEBTS && <p className="note">You can add up to {MAX_DEBTS} debts.</p>}
    </section>
  );
}
