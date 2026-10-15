import { useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import {
  areaPath,
  balanceSeries,
  clearOrder,
  linearScale,
  linePath,
  monthTicks,
  niceTicks,
  stackBands,
} from '@domain/chart';
import { BACKGROUND, DEBT_COLORS, STRATEGY_COLORS, STRATEGY_NAMES } from '@domain/colors';
import type { Comparison } from '@domain/engine';
import { formatPounds, formatPoundsShort } from '@domain/money';
import { addMonths, formatMonth, shortMonth, type Month } from '@domain/months';
import { STRATEGIES, type Debt, type Plan, type Strategy } from '@domain/types';
import { colors, font, space } from '@/theme';

const HEIGHT = 240;
const M = { top: 12, right: 8, bottom: 26, left: 52 };
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

interface FrameProps {
  xMax: number;
  yMax: number;
  start: Month;
  month: number;
  /** Written for people who cannot see the chart. */
  label: string;
  onMonth: (month: number) => void;
  /** The last month that can be looked at. */
  lastMonth: number;
  children: (s: {
    x: (m: number) => number;
    y: (p: number) => number;
    width: number;
    plotBottom: number;
  }) => React.ReactNode;
}

/**
 * Axes, grid lines and the touch handling that both charts share. Dragging a finger across the chart chooses the month.
 * For a screen reader the chart is one adjustable control: swipe up or down to move a month, and it reads out the month.
 */
function Frame({ xMax, yMax, start, month, label, onMonth, lastMonth, children }: FrameProps) {
  const [width, setWidth] = useState(0);
  const plotW = Math.max(0, width - M.left - M.right);
  const x = linearScale([0, Math.max(1, xMax)], [M.left, M.left + plotW]);
  const ticks = niceTicks(yMax, 4);
  const top = ticks.at(-1) ?? yMax;
  const plotBottom = HEIGHT - M.bottom;
  const y = linearScale([0, top || 1], [plotBottom, M.top]);

  const choose = (e: GestureResponderEvent) => {
    if (plotW <= 0) return;
    const m = Math.round(((e.nativeEvent.locationX - M.left) / plotW) * Math.max(1, xMax));
    onMonth(Math.min(Math.max(m, 1), Math.max(lastMonth, 1)));
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      // dragging a finger across the chart chooses the month
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={choose}
      onResponderMove={choose}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      // react-native-web does not turn accessibilityValue into aria-value* attributes, and a slider needs them
      aria-valuemin={1}
      aria-valuemax={lastMonth}
      aria-valuenow={month}
      aria-valuetext={`Month ${month}, ${formatMonth(addMonths(start, Math.max(0, month - 1)))}`}
      accessibilityValue={{
        min: 1,
        max: lastMonth,
        now: month,
        text: `Month ${month}, ${formatMonth(addMonths(start, Math.max(0, month - 1)))}`,
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onMonth(Math.min(month + 1, lastMonth));
        if (e.nativeEvent.actionName === 'decrement') onMonth(Math.max(month - 1, 1));
      }}
      testID="chart"
    >
      <Svg width={width} height={HEIGHT} accessible={false}>
        <Rect x={0} y={0} width={width} height={HEIGHT} fill={BACKGROUND} />
        {ticks.map((tick) => (
          <G key={tick}>
            <Line x1={M.left} x2={width - M.right} y1={y(tick)} y2={y(tick)} stroke="#d9dee7" />
            <SvgText x={M.left - 6} y={y(tick) + 4} fontSize={11} fill="#3d4757" textAnchor="end">
              {formatPoundsShort(tick)}
            </SvgText>
          </G>
        ))}
        {monthTicks(xMax).map((m) => (
          <SvgText key={m} x={x(m)} y={HEIGHT - 8} fontSize={11} fill="#3d4757" textAnchor="middle">
            {shortMonth(addMonths(start, m))}
          </SvgText>
        ))}
        {width > 0 && children({ x, y, width, plotBottom })}
        <Line
          x1={x(Math.min(month, xMax))}
          x2={x(Math.min(month, xMax))}
          y1={M.top}
          y2={plotBottom}
          stroke="#1d2433"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      </Svg>
    </View>
  );
}

interface RaceProps {
  comparison: Comparison;
  startingTotal: number;
  start: Month;
  month: number;
  lastMonth: number;
  onMonth: (month: number) => void;
}

function describeRace(comparison: Comparison, start: Month): string {
  const parts = STRATEGIES.map((s) => {
    const plan = comparison[s];
    return plan.paidOff
      ? `${STRATEGY_NAMES[s]} is clear in ${formatMonth(finishMonth(plan, start))}, after ${plan.months.length} months`
      : `${STRATEGY_NAMES[s]} never clears the debts`;
  });
  return `Line chart of the total still owed, month by month, for the three plans. ${parts.join('. ')}. Swipe up or down to change the month.`;
}

/** The three strategies racing: the total still owed over time, with the month being looked at marked on each line. */
export function RaceChart({ comparison, startingTotal, start, month, lastMonth, onMonth }: RaceProps) {
  const xMax = raceSpan(comparison);
  const yMax = startingTotal * 1.02;
  return (
    <View>
      <Frame
        xMax={xMax}
        yMax={yMax}
        start={start}
        month={month}
        lastMonth={lastMonth}
        onMonth={onMonth}
        label={describeRace(comparison, start)}
      >
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
              return (
                <G key={strategy}>
                  <Path
                    d={linePath(points)}
                    fill="none"
                    stroke={color}
                    strokeWidth={3}
                    strokeDasharray={DASH[strategy]}
                    strokeLinejoin="round"
                  />
                  {plan.paidOff && <Circle cx={x(plan.months.length)} cy={y(0)} r={4} fill={color} />}
                  <Circle
                    cx={x(Math.min(month, xMax))}
                    cy={y(Math.min(series[month] ?? 0, yMax))}
                    r={5}
                    fill="#fff"
                    stroke={color}
                    strokeWidth={3}
                  />
                </G>
              );
            })}
          </>
        )}
      </Frame>
      <View style={styles.legend}>
        {STRATEGIES.map((strategy) => {
          const plan = comparison[strategy];
          const series = balanceSeries(plan, startingTotal);
          return (
            <Text key={strategy} style={styles.legendText}>
              <Text style={{ color: STRATEGY_COLORS[strategy], fontWeight: '700' }}>
                {STRATEGY_NAMES[strategy]}
              </Text>
              {': '}
              {plan.paidOff ? `clear in ${formatMonth(finishMonth(plan, start))}` : 'never clears the debts'};
              owes {formatPounds(series[Math.min(month, series.length - 1)] ?? 0)} in month {month}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

interface StackProps {
  debts: Debt[];
  plan: Plan;
  startingTotal: number;
  start: Month;
  month: number;
  onMonth: (month: number) => void;
}

function describeStack(debts: Debt[], plan: Plan, start: Month): string {
  const parts = clearOrder(debts, plan).map((d) => {
    const at = plan.clearedIn[d.id];
    return at
      ? `${d.name} is cleared in ${formatMonth(addMonths(start, at - 1))}`
      : `${d.name} is never cleared`;
  });
  return `Stacked area chart of what is owed on each debt, month by month. ${parts.join('. ')}. Swipe up or down to change the month.`;
}

/** What is owed on each debt, stacked. The debt cleared last is at the bottom, so the stack peels away from the top. */
export function StackChart({ debts, plan, startingTotal, start, month, onMonth }: StackProps) {
  const xMax = Math.max(1, plan.months.length);
  const bands = stackBands(debts, plan);
  const colorOf = (id: string) => DEBT_COLORS[debts.findIndex((d) => d.id === id) % DEBT_COLORS.length]!;
  return (
    <View>
      <Frame
        xMax={xMax}
        yMax={startingTotal * 1.02}
        start={start}
        month={month}
        lastMonth={plan.months.length}
        onMonth={onMonth}
        label={describeStack(debts, plan, start)}
      >
        {({ x, y }) => (
          <>
            {bands.map((band) => (
              <Path
                key={band.id}
                d={areaPath(
                  band.layers.map((l, m) => ({ x: x(m), y: y(l.upper) })),
                  band.layers.map((l, m) => ({ x: x(m), y: y(l.lower) })),
                )}
                fill={colorOf(band.id)}
                stroke="#fff"
                strokeWidth={1.5}
              />
            ))}
          </>
        )}
      </Frame>
      <View style={styles.legend}>
        {clearOrder(debts, plan).map((debt) => {
          const at = plan.clearedIn[debt.id];
          return (
            <View key={debt.id} style={styles.legendRow}>
              <View style={[styles.swatch, { backgroundColor: colorOf(debt.id) }]} />
              <Text style={styles.legendText}>
                <Text style={{ fontWeight: '700' }}>{debt.name}</Text>{' '}
                {at ? `cleared in ${formatMonth(addMonths(start, at - 1))}` : 'never cleared'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { marginTop: space.sm, gap: space.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  legendText: { fontSize: font.small, color: colors.text, lineHeight: 19, flexShrink: 1 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
});
