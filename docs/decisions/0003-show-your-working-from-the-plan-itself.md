# 0003: The working is read from the plan, never recomputed

Status: accepted

## Context

The point of "show your working" is that a person can check a number with a calculator. If the explanation were produced by a
second calculation, the two could drift apart and the explanation would be a confident description of something that is not
what happened. That is the failure the project is meant to avoid: advice that sits next to a calculation it cannot account for.

## Decision

`explainMonth` (`src/domain/explain.ts`) reads every figure from the plan the engine produced: opening balance, interest,
minimum, extra, payment, closing balance, the order the extra was offered in, and the budget. It adds only words and
sums built from those figures ("£950.00 × 39.9% ÷ 12 = £31.59 (rounded to the nearest penny)", "£950.00 + £31.59 − £190.00 =
£791.59"), and says why a debt got the extra from the strategy and the order stored with the month.

## Consequences

- A property test runs the explanation against the plan for any debts, any extra and every strategy, in every month: the numbers
  match, the closing balance equals opening plus interest minus payment, and the interest sum is honest.
- The explanation can only describe what the plan did. If the engine's rules changed, the explanation would follow.
- The explanation costs nothing to compute, so the panel follows the month slider instantly.
