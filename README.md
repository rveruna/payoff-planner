# Payoff Planner

[![CI](https://github.com/rveruna/payoff-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/rveruna/payoff-planner/actions/workflows/ci.yml)
[![CodeQL](https://github.com/rveruna/payoff-planner/actions/workflows/codeql.yml/badge.svg)](https://github.com/rveruna/payoff-planner/actions/workflows/codeql.yml)

**[Live demo](https://rveruna.github.io/payoff-planner/)**

Which debt should you pay off first? Enter several debts, and the planner compares three ways of paying them (avalanche,
snowball and minimum payments only), shows them racing, and, for any month you choose, **shows exactly how every number was
worked out**, down to the sum you could check with a calculator.

The idea comes from my last job, a mobile app for an AI-driven financial adviser where conversational AI had to sit next to
strictly deterministic, auditable advice. This project is separate: it uses only public algorithms and invented sample debts and
rates, and nothing from any employer. Here the same principle is small enough to read: the numbers are exact, and the
explanation is checked against them.

It is an educational demo, not financial advice, and nothing leaves your browser.

## What it does

- Compares **avalanche** (extra to the highest rate first), **snowball** (extra to the smallest balance first) and
  **minimum payments only**, with the date you are debt-free and the interest each costs
- Drag the **extra payment** slider and every result updates at once
- **The race**: the three plans as lines over time. **Debt by debt**: a stacked chart that peels away from the top as each debt is cleared
- **Look at a month**: a slider, a drag across either chart, a click on the table, or a **play** button that runs the plan month by
  month. The working below follows it
- **Show your working**: for the month you are looking at, each debt's opening balance, the interest sum (`£950.00 × 39.9% ÷ 12 =
£31.59`), what was paid and why the extra went where it did, and the closing balance
- Says plainly when a plan **never finishes** (a minimum that does not cover a month's interest), and warns about it on the debt
- The whole plan is in the **link**, so it can be shared, and nothing is stored anywhere

## Run it

```bash
npm install
npm run dev
npm test               # 273 tests
npm run test:coverage
npm run build
npm run lint
npm run size           # bundle budget, after a build
npm run perf:lighthouse
```

## How it is built

```
src/
  domain/       money, months, the engine, strategy order, explanation, scenario and link, chart maths (no React)
  hooks/        the scenario in the URL, playback, an eased number, reduced motion
  components/   debts editor, headline, strategy cards, charts, working panel, schedule table
docs/decisions/ the reasoning behind the main choices
```

- **Money is whole pence.** Amounts and rates are integers, interest is rounded to the nearest penny with halves going up using
  whole-number arithmetic only, and pounds are only produced by formatting ([0001](docs/decisions/0001-money-in-whole-pence.md)).
- **A plain model** that can be held in your head, with what it leaves out written down
  ([0002](docs/decisions/0002-a-plain-model-and-what-it-leaves-out.md)).
- **The working is read from the plan**, never recomputed, so it cannot disagree with the numbers it explains
  ([0003](docs/decisions/0003-show-your-working-from-the-plan-itself.md)).
- **The link is the saved plan**, read defensively as untrusted input
  ([0005](docs/decisions/0005-the-link-is-the-saved-plan.md)).

## Practices

- **Tests:** 273 (Vitest, Testing Library, fast-check). Coverage is about 99% of statements and 95% of branches. They include worked
  examples calculated by hand, an independent BigInt reference for a single debt, and properties that must hold for any debts
  (no negative balances, every figure whole pence, the total paid equals what was owed plus the interest, and the working always
  agrees with the plan).
- **What the property tests found** ([0004](docs/decisions/0004-property-tests-and-what-they-found.md)): snowball is not monotonic.
  With 37,299p of extra a month a plan takes 43 months, and with 37,300p it takes 45 and costs £2,809.90 more, because two balances
  cross and the order flips. Avalanche, ranked by rates that never change, did not show this in 60,000 random cases. The tests
  claim "paying more never hurts" for avalanche only, and pin the snowball cases as documented examples.
- **Mutation check:** I made about 30 deliberate changes to the money rules, the engine, the strategy order, the explanation, link
  parsing, the chart maths and the interface. Five were not caught at first. Three were real gaps in my tests (a tie-break in
  snowball, playback carrying on when the plan shrinks, and a note that should be absent in a normal month), which I closed. Two
  change nothing that can be observed (a redundant check, and an attribute that only matters while a field is being edited).
  Every other change was caught.
- **Bugs found while building, in my own work:** a name was trimmed and refilled on every keystroke, so it could not be typed; the
  table pulled the whole page down on load; the axis labels repeated the year; and the layout scrolled sideways on a phone.
- **Quality gates in CI:** an audit of production dependencies, lint, a Prettier check, the build, the tests with coverage, a bundle
  budget and Lighthouse with minimum scores. A pre-commit hook formats and lints staged files. Dependabot and CodeQL are on.
- **Performance:** [docs/performance.md](docs/performance.md). Lighthouse gives 100 in all four categories on simulated Slow 4G,
  with 101 kB of JavaScript. All three plans are worked out in about 0.1 to 0.5 ms.

## Accessibility

- Each chart has a written description, and a table lists every month with the same figures. The three plans differ by line style
  (solid, dashed, dotted) as well as colour, and the legends give the figures in words. Chart colours are tested at 3:1.
- Every control has a label, a message for invalid input is read with the field, the result is announced politely, the month
  slider has a spoken value, and the table scrolls inside its own focusable box without moving the page.
- axe finds no violations in the tests or in real Chrome (contrast included), with the sample debts, with no debts, with a plan that
  never finishes and with an invalid field. I have not tested with a screen reader or on a real phone.

## Limits

- **It is a simple model, not your lender's.** It charges interest monthly at a twelfth of the yearly rate, rounded to the penny.
  Real lenders may charge daily, add fees, use promotional or variable rates, set a minimum as a percentage of the balance, or
  round differently. A statement can differ by pounds over a long plan, and more with fees.
- **The sample debts and rates are invented**, and are not real products.
- **Snowball can behave oddly**, as above. It is shown as it is.
- **Fifty years is the longest plan worked out.** A plan not finished by then is reported as never paid off.
- **Not financial advice.** It compares two common strategies and a minimum-payments baseline on the numbers you give it, and leaves out everything else about your
  situation.
