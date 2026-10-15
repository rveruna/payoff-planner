import { useEffect, useRef } from 'react';
import { formatPounds } from '../domain/money';
import { addMonths, formatMonth, type Month } from '../domain/months';
import type { Plan } from '../domain/types';

interface Props {
  plan: Plan;
  start: Month;
  month: number;
  onSelect: (month: number) => void;
}

/** Every month of the plan as a table. It carries all the figures in the charts, and a row can be chosen to look at it. */
export function ScheduleTable({ plan, start, month, onSelect }: Props) {
  const selected = useRef<HTMLTableRowElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // keep the chosen month in view inside the table as it moves, without ever moving the page itself
  useEffect(() => {
    const row = selected.current;
    const box = scroller.current;
    if (!row || !box) return;
    const header = box.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    if (row.offsetTop - header < box.scrollTop) box.scrollTop = row.offsetTop - header;
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight;
  }, [month]);

  return (
    <section className="card" aria-labelledby="schedule-heading">
      <h2 id="schedule-heading">Month by month, as a table</h2>
      <div
        ref={scroller}
        className="table-scroll"
        role="region"
        aria-label="Payment schedule, scrollable"
        tabIndex={0}
      >
        <table>
          <caption>What is paid, the interest added and what is still owed, at the end of each month</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Date</th>
              <th scope="col">Paid</th>
              <th scope="col">Interest added</th>
              <th scope="col">Still owed</th>
            </tr>
          </thead>
          <tbody>
            {plan.months.map((row) => (
              <tr
                key={row.month}
                ref={row.month === month ? selected : undefined}
                className={row.month === month ? 'selected' : undefined}
              >
                <th scope="row">
                  <button
                    type="button"
                    className="link-button"
                    aria-current={row.month === month ? 'true' : undefined}
                    onClick={() => onSelect(row.month)}
                  >
                    {row.month}
                  </button>
                </th>
                <td>{formatMonth(addMonths(start, row.month - 1))}</td>
                <td>{formatPounds(row.payment)}</td>
                <td>{formatPounds(row.interest)}</td>
                <td>{formatPounds(row.closing)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
