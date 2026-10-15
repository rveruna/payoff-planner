# 0004: Property-based tests, and what they found

Status: accepted

## Context

A payoff engine has too many cases to list: any number of debts, any balances, rates and minimums. Hand-written examples
check the cases I thought of. Property-based tests (fast-check) check statements that should be true for any input.

## Decision

Three kinds of test, side by side:

- **Worked examples**, calculated by hand and written in the test, such as a month with two debts where the interest, the
  split of the extra and the closing balances are all stated.
- **An independent reference**: a plain BigInt implementation of one debt paid a fixed amount, which the engine must agree
  with in months, total interest and every balance, plus the standard repayment formula for the number of months.
- **Properties for any debts**: no balance is below zero and every figure is whole pence; closing equals opening plus interest
  minus payment; one month's closing is the next month's opening; a month never pays more than its budget; every month but the
  last uses all of it; the total paid is what was owed plus the interest; each debt's cleared month is right; the answer is the
  same every time; the explanation agrees with the plan.

## What they found

- **Snowball is not monotonic.** Paying more can cost more interest, and can even make the plan longer. One example: with
  37,299 pence of extra a month the plan takes 43 months, and with 37,300 it takes 45 months and costs £2,809.90 more, because
  two balances cross around month 30, the order flips, and the money goes to a 12.6% debt before a 26% one. Snowball ranks by
  balance, which is a discontinuous rule, so a penny can change everything. Avalanche ranks by rate, which never changes, and
  60,000 random cases found no such effect. The "never longer or dearer" claims are therefore tested for avalanche only, and
  the snowball cases are pinned as documented examples.
- **A slack for rounding.** Avalanche is never worse than snowball except by a few pence of rounding, since interest is rounded
  per debt per month, so that comparison allows a few pence per month.
- **My own generator.** The first generator produced a £600 debt at 0% with a £1 minimum, which really does take over 50
  years; the properties are about debts that can be cleared within the limit, so the generator says so.
- **A real bug in the interface**, from an ordinary test: a name was trimmed and refilled with a fallback on every keystroke, so
  it could not be typed.

## Consequences

- The suite is fast (about a second), so the properties run on every commit.
- A counterexample is a test to keep: the two snowball cases are in the suite with their numbers.
