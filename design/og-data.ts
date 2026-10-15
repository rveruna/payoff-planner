// Prints the three lines of the sample plan as SVG paths for the link-preview picture. Run: npx vite-node design/og-data.ts
import { balanceSeries } from '../src/domain/chart';
import { comparePlans } from '../src/domain/engine';
import { DEFAULT_SCENARIO } from '../src/domain/scenario';

const debts = DEFAULT_SCENARIO.debts;
const total = debts.reduce((s, d) => s + d.balance, 0);
const plans = comparePlans(debts, DEFAULT_SCENARIO.extra);
const W = 520;
const H = 300;
const span = 92;
for (const key of ['minimum', 'snowball', 'avalanche'] as const) {
  const series = balanceSeries(plans[key], total);
  const points = Array.from({ length: span + 1 }, (_, m) => {
    const x = (m / span) * W;
    const y = H - ((series[m] ?? 0) / total) * H;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  console.log(`${key}: M${points.join(' L')}`);
}
