# 0001: Money is whole pence, and the rounding rule is written down

Status: accepted

## Context

Floating point cannot hold 0.1 exactly, and sums of money built from it drift by fractions of a penny that eventually show up
as a total that is 1p out, or a balance of 0.00000001 that never quite clears. A payoff plan adds up hundreds of small
amounts, so it needs to be exact.

## Decision

- Every amount is a whole number of pence (`Pence`), every rate is a whole number of basis points (2490 is 24.9%), and no
  floating point number of pounds is ever stored. Pounds are only produced by formatting, with string arithmetic.
- Interest for a month is `balance × rate ÷ 12`, rounded to the nearest penny with halves going up, using whole-number
  arithmetic only (`roundDiv`, `src/domain/money.ts`). So 50p at 12% a year, which is exactly half a penny, is 1p.
- Amounts typed by a person are read from their text, not through a float: `1,234.5` becomes 123450 by splitting at the point,
  and anything that is not a plain amount (`1.234`, `-5`, `1e3`) is refused rather than guessed at. The limits are £10 million
  and 99.99%.

## Consequences

- Every figure in a plan is an integer, and a test checks that for any debts at all. The total paid is always exactly what
  was owed plus the interest, also checked for any debts.
- The rounding rule is stated beside every worked interest figure ("rounded to the nearest penny"), and is the only place a
  figure is not exact.
- Real lenders may round differently (down, or per day), so a lender's own statement can differ by pennies.
