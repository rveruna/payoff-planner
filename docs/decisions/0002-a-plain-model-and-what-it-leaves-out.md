# 0002: A plain monthly model, and what it leaves out

Status: accepted

## Context

Real debts have daily interest, fees, promotional rates, minimums that are a percentage of the balance, variable rates and
payments that land on particular days. A model that tried to cover all of that would be wrong in more places and harder to
check. The point is to compare strategies and show the working, which needs a model small enough to hold in your head.

## Decision

Each month, in this order:

1. Every debt still open is charged a month of interest, a twelfth of its yearly rate.
2. Every open debt gets its minimum, or what is left of it if that is less.
3. For avalanche and snowball, what remains of the budget goes to the open debts in priority order, each taking what it
   needs. The budget is every debt's minimum, including those already cleared, plus the extra, so a cleared debt's payment
   rolls on. For the minimum plan there is no rolling and no extra.

Avalanche offers the extra to the highest rate first and snowball to the smallest balance first, with ties settled by the other
measure and then by id, so the result never depends on the order the debts were typed in.

A plan that is not finished after 50 years is reported as never paid off, and the headline says so. That happens whenever a
minimum does not cover a month's interest and nothing else is paid.

## Consequences

- Left out, and said on the page and in the README: fees, daily interest, promotional rates, variable rates, minimums that
  change with the balance, and the day a payment lands. The sample debts and rates are invented.
- The model has a few exact properties that can be tested, which is what the property tests do.
- It is an educational tool and not advice, and the footer says so.
