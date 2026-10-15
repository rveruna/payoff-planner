import { balanceSeries, linePath } from '../domain/chart';
import { STRATEGY_COLORS, STRATEGY_NAMES } from '../domain/colors';
import type { Comparison } from '../domain/engine';
import { formatPounds } from '../domain/money';
import { addMonths, formatMonth, type Month } from '../domain/months';
import { STRATEGIES, type Plan, type Strategy } from '../domain/types';
import { ChartFrame, MARGIN, WIDTH } from './ChartFrame';

interface Props {
  comparison: Comparison;
  startingTotal: number;
  start: Month;
  /** The month being looked at. */
  month: number;
  onScrub: (month: number) => void;
}

const DASH: Record<Strategy, string | undefined> = { avalanche: undefined, snowball: '8 4', minimum: '2 4' };

/** The plan's finishing month, as a date. */
export const finishMonth = (plan: Plan, start: Month): Month =>
  addMonths(start, Math.max(0, plan.months.length - 1));

/** How far along the x axis to draw: a little past the longest plan that finishes, or a fixed span if none do. */
export function raceSpan(comparison: Comparison): number {
  const finite = STRATEGIES.map((s) => comparison[s])
    .filter((p) => p.paidOff)
    .map((p) => p.months.length);
  return finite.length > 0 ? Math.max(12, Math.ceil(Math.max(...finite) * 1.1)) : 120;
}

function describe(comparison: Comparison, start: Month): string {
  const parts = STRATEGIES.map((s) => {
    const plan = comparison[s];
    return plan.paidOff
      ? `${STRATEGY_NAMES[s]} is clear in ${formatMonth(finishMonth(plan, start))}, after ${plan.months.length} months`
      : `${STRATEGY_NAMES[s]} never clears the debts`;
  });
  return `Line chart of the total still owed, month by month, for the three plans. ${parts.join('. ')}. The same figures are in the table below.`;
}

/** The three strategies racing: the total still owed over time, with the month being looked at marked on each line. */
export function RaceChart({ comparison, startingTotal, start, month, onScrub }: Props) {
  const xMax = raceSpan(comparison);
  const yMax = startingTotal * 1.02;

  return (
    <figure className="figure">
      <ChartFrame xMax={xMax} yMax={yMax} start={start} label={describe(comparison, start)} onScrub={onScrub}>
        {({ x, y }) => (
          <>
            {STRATEGIES.map((strategy) => {
              const plan = comparison[strategy];
              const series = balanceSeries(plan, startingTotal);
              const points = Array.from({ length: xMax + 1 }, (_, m) => ({
                x: x(m),
                y: y(Math.min(series[m] ?? 0, yMax)),
              }));
              const color = STRATEGY_COLORS[strategy];
              const atMonth = Math.min(series[month] ?? 0, yMax);
              return (
                <g key={strategy}>
                  <path
                    d={linePath(points)}
                    fill="none"
                    stroke={color}
                    strokeWidth={3}
                    strokeDasharray={DASH[strategy]}
                    strokeLinejoin="round"
                  />
                  {plan.paidOff && <circle cx={x(plan.months.length)} cy={y(0)} r={5} fill={color} />}
                  <circle
                    cx={x(Math.min(month, xMax))}
                    cy={y(atMonth)}
                    r={5}
                    fill="#fff"
                    stroke={color}
                    strokeWidth={3}
                  />
                </g>
              );
            })}
            <line
              x1={x(Math.min(month, xMax))}
              x2={x(Math.min(month, xMax))}
              y1={MARGIN.top}
              y2={y(0)}
              stroke="#1d2433"
              strokeWidth={1}
              strokeDasharray="3 3"
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
        {STRATEGIES.map((strategy) => {
          const plan = comparison[strategy];
          const series = balanceSeries(plan, startingTotal);
          return (
            <li key={strategy}>
              <svg width="34" height="10" aria-hidden="true">
                <line
                  x1="1"
                  x2="33"
                  y1="5"
                  y2="5"
                  stroke={STRATEGY_COLORS[strategy]}
                  strokeWidth="3"
                  strokeDasharray={DASH[strategy]}
                />
              </svg>
              <strong>{STRATEGY_NAMES[strategy]}</strong>
              <span>
                {plan.paidOff
                  ? `clear in ${formatMonth(finishMonth(plan, start))}`
                  : 'never clears the debts'}
                ; owes {formatPounds(series[Math.min(month, series.length - 1)] ?? 0)} in month {month}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
