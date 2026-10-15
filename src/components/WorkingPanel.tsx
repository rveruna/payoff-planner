import { explainMonth } from '../domain/explain';
import { formatPounds } from '../domain/money';
import { addMonths, formatMonth, type Month } from '../domain/months';
import type { Debt, Plan } from '../domain/types';

interface Props {
  plan: Plan;
  debts: Debt[];
  start: Month;
  month: number;
}

/** Every number for one month, with the sum that produced it, so a person can check it with a calculator. */
export function WorkingPanel({ plan, debts, start, month }: Props) {
  const explanation = explainMonth(plan, debts, month);
  if (!explanation) return null;

  return (
    <section className="card working" aria-labelledby="working-heading">
      <h2 id="working-heading">Show your working</h2>
      <p className="note">
        Every figure for month {month} ({formatMonth(addMonths(start, month - 1))}), as worked out by the
        plan. Interest is charged first, then the payments are made.
      </p>
      <p className="budget">{explanation.budgetWorking}</p>

      <ol className="steps">
        {explanation.steps.map((step) => (
          <li key={step.id} className={step.cleared ? 'step cleared' : 'step'}>
            <h3>
              {step.name}
              {step.cleared && <span className="badge"> cleared this month</span>}
            </h3>
            <dl>
              <div>
                <dt>Owed at the start</dt>
                <dd>{formatPounds(step.opening)}</dd>
              </div>
              <div>
                <dt>Interest added</dt>
                <dd>{step.interestWorking}</dd>
              </div>
              <div>
                <dt>Paid</dt>
                <dd>
                  {formatPounds(step.payment)}
                  {step.extra > 0
                    ? ` = ${formatPounds(step.minimum)} minimum + ${formatPounds(step.extra)} extra`
                    : ` = the minimum`}
                  {step.minimumNote ? `. ${step.minimumNote}` : ''}
                </dd>
              </div>
              {step.extraReason && (
                <div>
                  <dt>Why the extra is here</dt>
                  <dd>{step.extraReason}</dd>
                </div>
              )}
              <div>
                <dt>Owed at the end</dt>
                <dd>
                  {formatPounds(step.opening)} + {formatPounds(step.interest)} − {formatPounds(step.payment)}{' '}
                  = <strong>{formatPounds(step.closing)}</strong>
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
      {explanation.unused > 0 && (
        <p className="note">
          {formatPounds(explanation.unused)} of this month&rsquo;s budget was not needed, because every debt
          is now paid off.
        </p>
      )}
    </section>
  );
}
