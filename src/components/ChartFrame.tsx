import type { ReactNode } from 'react';
import { linearScale, niceTicks } from '../domain/chart';
import { formatPoundsShort } from '../domain/money';
import { addMonths, formatMonth, type Month } from '../domain/months';

export const WIDTH = 720;
export const HEIGHT = 320;
export const MARGIN = { top: 16, right: 16, bottom: 34, left: 68 };

export interface Scales {
  x: (month: number) => number;
  y: (pence: number) => number;
  /** The month under a horizontal position in the picture. */
  monthAt: (px: number) => number;
  plotBottom: number;
}

interface Props {
  xMax: number;
  yMax: number;
  start: Month;
  label: string;
  /** Called with the month under the pointer while it is pressed or dragged. */
  onScrub?: (month: number) => void;
  children: (scales: Scales) => ReactNode;
}

/** Month ticks that are a whole number of years apart, or half years for a short plan. */
export function monthTicks(xMax: number): number[] {
  const step = xMax <= 24 ? 6 : xMax <= 120 ? 12 : xMax <= 300 ? 24 : 60;
  const ticks: number[] = [];
  for (let m = 0; m <= xMax; m += step) ticks.push(m);
  return ticks;
}

/** "Oct 2026": the first three letters of the month and the year. */
export const short = (month: Month) => formatMonth(month).replace(/^(\w{3})\w*/, '$1');

/** Axes, grid lines and the pointer handling that both charts share. */
export function ChartFrame({ xMax, yMax, start, label, onScrub, children }: Props) {
  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = linearScale([0, Math.max(1, xMax)], [MARGIN.left, MARGIN.left + plotW]);
  const ticks = niceTicks(yMax, 4);
  const top = ticks.at(-1) ?? yMax;
  const y = linearScale([0, top || 1], [MARGIN.top + plotH, MARGIN.top]);
  const plotBottom = MARGIN.top + plotH;

  const monthAt = (px: number) => Math.round(((px - MARGIN.left) / plotW) * Math.max(1, xMax));

  const pointerMonth = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / (rect.width || WIDTH)) * WIDTH;
    onScrub?.(monthAt(px));
  };

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        pointerMonth(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) pointerMonth(e);
      }}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="#d9dee7" />
          <text x={MARGIN.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="12" fill="#3d4757">
            {formatPoundsShort(tick)}
          </text>
        </g>
      ))}
      {monthTicks(xMax).map((m) => (
        <text key={m} x={x(m)} y={HEIGHT - 10} textAnchor="middle" fontSize="12" fill="#3d4757">
          {short(addMonths(start, m))}
        </text>
      ))}
      {children({ x, y, monthAt, plotBottom })}
    </svg>
  );
}
