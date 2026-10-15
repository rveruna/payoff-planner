import { areaPath, clearOrder, stackBands } from '../domain/chart';
import { DEBT_COLORS } from '../domain/colors';
import { formatMonth, addMonths, type Month } from '../domain/months';
import type { Debt, Plan } from '../domain/types';
import { ChartFrame, MARGIN, WIDTH } from './ChartFrame';

interface Props {
  debts: Debt[];
  plan: Plan;
  startingTotal: number;
  start: Month;
  month: number;
  onScrub: (month: number) => void;
}

function describe(debts: Debt[], plan: Plan, start: Month): string {
  const order = clearOrder(debts, plan);
  const parts = order.map((d) => {
    const at = plan.clearedIn[d.id];
    return at
      ? `${d.name} is cleared in ${formatMonth(addMonths(start, at - 1))}`
      : `${d.name} is never cleared`;
  });
  return `Stacked area chart of what is owed on each debt, month by month. ${parts.join('. ')}. The same figures are in the table below.`;
}

/** What is owed on each debt, stacked. The debt cleared last is at the bottom, so the stack peels away from the top. */
export function StackChart({ debts, plan, startingTotal, start, month, onScrub }: Props) {
  const xMax = Math.max(1, plan.months.length);
  const bands = stackBands(debts, plan);
  const colorOf = (id: string) => DEBT_COLORS[debts.findIndex((d) => d.id === id) % DEBT_COLORS.length]!;
  const nameOf = (id: string) => debts.find((d) => d.id === id)?.name ?? id;

  return (
    <figure className="figure">
      <ChartFrame
        xMax={xMax}
        yMax={startingTotal * 1.02}
        start={start}
        label={describe(debts, plan, start)}
        onScrub={onScrub}
      >
        {({ x, y }) => (
          <>
            {bands.map((band) => (
              <path
                key={band.id}
                d={areaPath(
                  band.layers.map((l, m) => ({ x: x(m), y: y(l.upper) })),
                  band.layers.map((l, m) => ({ x: x(m), y: y(l.lower) })),
                )}
                fill={colorOf(band.id)}
                stroke="#fff"
                strokeWidth={1.5}
              >
                <title>{nameOf(band.id)}</title>
              </path>
            ))}
            <line
              x1={x(Math.min(month, xMax))}
              x2={x(Math.min(month, xMax))}
              y1={MARGIN.top}
              y2={y(0)}
              stroke="#1d2433"
              strokeWidth={2}
            />
            <rect
              x={MARGIN.left}
              y={MARGIN.top}
              width={WIDTH - MARGIN.left - MARGIN.right}
              height={y(0) - MARGIN.top}
              fill="transparent"
            />
          </>
        )}
      </ChartFrame>
      <ul className="legend">
        {clearOrder(debts, plan).map((debt) => {
          const at = plan.clearedIn[debt.id];
          const cleared = at !== null && at !== undefined && month >= at;
          return (
            <li key={debt.id}>
              <span className="swatch" style={{ background: colorOf(debt.id) }} aria-hidden="true" />
              <strong>{debt.name}</strong>
              <span>
                {at ? `cleared in ${formatMonth(addMonths(start, at - 1))}` : 'never cleared'}
                {cleared ? ' (already cleared at this point)' : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
