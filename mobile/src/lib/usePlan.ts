import { useMemo, useState } from 'react';
import { comparePlans } from '@domain/engine';
import { displayName } from '@domain/scenario';
import { currentMonth } from '@/lib/today';
import { useScenarioStore } from '@/store/scenarioStore';

/**
 * Everything the screens need from the saved scenario, worked out once: the debts with names to show, all three plans,
 * the chosen one and the total owed. The plans are recalculated whenever the debts or the extra change, which takes well
 * under a millisecond.
 */
export function usePlan() {
  const debts = useScenarioStore((s) => s.debts);
  const extra = useScenarioStore((s) => s.extra);
  const strategy = useScenarioStore((s) => s.strategy);
  // the plan starts in the month the screen was first shown, so it does not shift under someone who has the app open
  const [start] = useState(currentMonth);

  const shown = useMemo(() => debts.map((d, i) => ({ ...d, name: displayName(d, i) })), [debts]);
  const comparison = useMemo(() => comparePlans(shown, extra), [shown, extra]);
  const startingTotal = useMemo(() => shown.reduce((sum, d) => sum + d.balance, 0), [shown]);

  return { debts: shown, extra, strategy, comparison, plan: comparison[strategy], startingTotal, start };
}
