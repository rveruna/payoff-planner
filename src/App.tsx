import { useEffect, useId, useMemo, useState } from 'react';
import { DebtEditor } from './components/DebtEditor';
import { ExtraPayment } from './components/ExtraPayment';
import { Headline } from './components/Headline';
import { RaceChart } from './components/RaceChart';
import { ScheduleTable } from './components/ScheduleTable';
import { ShareButton } from './components/ShareButton';
import { StackChart } from './components/StackChart';
import { StrategyCards } from './components/StrategyCards';
import { WorkingPanel } from './components/WorkingPanel';
import { comparePlans } from './domain/engine';
import { addMonths, formatMonth, monthOf } from './domain/months';
import { DEFAULT_SCENARIO, displayName } from './domain/scenario';
import { useReducedMotion } from './hooks/useReducedMotion';
import { usePlayback } from './hooks/usePlayback';
import { useScenario } from './hooks/useScenario';

export default function App() {
  const [scenario, update] = useScenario();
  const reducedMotion = useReducedMotion();
  const [today] = useState(() => new Date());
  const monthId = useId();

  const start = scenario.start ?? monthOf(today);
  // a debt with no name is called "Debt 2" wherever it is shown, but is left blank in the field being edited
  const shown = useMemo(
    () => scenario.debts.map((d, i) => ({ ...d, name: displayName(d, i) })),
    [scenario.debts],
  );
  const comparison = useMemo(() => comparePlans(shown, scenario.extra), [shown, scenario.extra]);
  const plan = comparison[scenario.strategy];
  const startingTotal = scenario.debts.reduce((sum, d) => sum + d.balance, 0);
  const last = plan.months.length;

  const [chosen, setChosen] = useState(1);
  const month = last === 0 ? 0 : Math.min(Math.max(chosen, 1), last);
  const playback = usePlayback(month, last, setChosen);
  const scrub = (m: number) => {
    playback.stop();
    setChosen(Math.min(Math.max(m, 1), Math.max(last, 1)));
  };

  useEffect(() => {
    document.title =
      plan.paidOff && last > 0
        ? `Debt-free in ${formatMonth(addMonths(start, last - 1))}: Payoff Planner`
        : 'Payoff Planner';
  }, [plan.paidOff, last, start]);

  return (
    <>
      <header>
        <h1>Payoff Planner</h1>
        <p>
          Compare ways of paying off several debts, and see exactly how every number is worked out. The debts
          here are invented, so change them to your own.
        </p>
      </header>

      <main id="main" className="layout">
        <div className="inputs">
          <DebtEditor
            debts={scenario.debts}
            onChange={(debts) => update({ debts })}
            onUseSample={() => update({ debts: DEFAULT_SCENARIO.debts, extra: DEFAULT_SCENARIO.extra })}
          />
        </div>

        <div className="results">
          <Headline
            strategy={scenario.strategy}
            comparison={comparison}
            start={start}
            animate={!reducedMotion}
          />
          <ExtraPayment value={scenario.extra} onChange={(extra) => update({ extra })} />
          <StrategyCards
            value={scenario.strategy}
            comparison={comparison}
            start={start}
            onChange={(strategy) => update({ strategy })}
          />

          {last > 0 && (
            <>
              <section className="card scrubber" aria-label="Month to look at">
                <div className="field-row">
                  <label htmlFor={monthId}>Look at a month</label>
                  <output htmlFor={monthId}>
                    Month {month} · {formatMonth(addMonths(start, month - 1))}
                  </output>
                </div>
                <div className="scrub-row">
                  <button type="button" onClick={playback.toggle}>
                    {playback.playing ? 'Pause' : month >= last ? 'Play again' : 'Play the plan'}
                  </button>
                  <input
                    id={monthId}
                    type="range"
                    min={1}
                    max={last}
                    value={month}
                    aria-valuetext={`Month ${month}, ${formatMonth(addMonths(start, month - 1))}`}
                    onChange={(e) => scrub(Number(e.target.value))}
                  />
                </div>
                <p className="note">
                  Drag the slider, drag across a chart, or press play to watch the plan unfold. The working
                  below follows it.
                </p>
              </section>

              <section className="card" aria-labelledby="race-heading">
                <h2 id="race-heading">The race</h2>
                <p className="note">Total still owed over time, for each way of paying.</p>
                <RaceChart
                  comparison={comparison}
                  startingTotal={startingTotal}
                  start={start}
                  month={month}
                  onScrub={scrub}
                />
              </section>

              <section className="card" aria-labelledby="stack-heading">
                <h2 id="stack-heading">Debt by debt</h2>
                <p className="note">
                  What is owed on each debt with the chosen way of paying. Debts drop away from the top as
                  they are cleared.
                </p>
                <StackChart
                  debts={scenario.debts}
                  plan={plan}
                  startingTotal={startingTotal}
                  start={start}
                  month={month}
                  onScrub={scrub}
                />
              </section>

              <WorkingPanel plan={plan} debts={shown} start={start} month={month} />
              <ScheduleTable plan={plan} start={start} month={month} onSelect={scrub} />
            </>
          )}
          <ShareButton />
        </div>
      </main>

      <footer>
        <p>
          An educational demo, not financial advice, and nothing leaves your browser. Interest is charged
          monthly at a twelfth of the yearly rate and rounded to the nearest penny; real lenders differ (daily
          interest, fees, promotional rates, when a payment lands). The sample debts and rates are invented.
        </p>
      </footer>
    </>
  );
}
