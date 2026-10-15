# 0006: Charts backed by a table, and one month to look at

Status: accepted

## Context

The charts are what make the comparison land, but a chart is a picture. The number of people who cannot use one, or cannot tell
its colours apart, is not small.

## Decision

- The charts are SVG drawn by hand from pure functions (`src/domain/chart.ts`): scales, round tick marks, line and stacked-area
  paths. No charting library, so the bundle stays small and the maths can be tested without a browser.
- Each chart has a text description that says when each plan is cleared, and a table lists every month with the same figures,
  with a row that can be chosen. The three plans differ by line style as well as colour (solid, dashed, dotted), and the
  legend gives the figures in words.
- One month is shared by everything: a slider (also usable from the keyboard, with a spoken value), dragging across either
  chart, choosing a table row, and a play button all set the same month, and the charts' markers, the working panel and the
  table follow it. That one idea is what makes the page feel alive, and it is also what keeps the numbers consistent.
- The colours are tested at 3:1 against the white background. Colour is never the only carrier.
- The stack puts the debt cleared last at the bottom, so the stack peels away from the top as debts are cleared.

## Consequences

- Playing a plan is a timer that moves the month, so it needs no animation library and stops by itself at the end, or at once
  if the plan changes underneath it.
- Axe finds no violations in the tests or in real Chrome, contrast included. I have not tested with a screen reader.
- Where the page scrolls inside a box (the table), it scrolls only that box, never the page. A first version used
  `scrollIntoView` and pulled the whole page down on load.
