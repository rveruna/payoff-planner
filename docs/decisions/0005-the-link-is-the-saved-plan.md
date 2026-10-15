# 0005: The link is the saved plan

Status: accepted

## Context

There is no server and no account, and a plan should be shareable. A person might also paste a link they were sent.

## Decision

The whole scenario (the debts, the extra, the strategy and optionally the start month) is in the query string, one `d`
parameter per debt as `name~balance~rate~minimum`, with the money in pence and the rate in basis points. Only what differs from
the sample is written, so the default link is just the page.

Reading a link is defensive because it is untrusted input: a debt that is not in the shape is skipped, numbers are bounded
(balances up to £10 million, rates up to 99.99%), there are at most eight debts, names are cut to 30 characters and the
separator and control characters become spaces, an unknown strategy or a start that is not a month falls back to the default,
and a name that looks like markup is just text (React renders it as text).

Names are not trimmed or refilled while being edited, since a name is typed one letter at a time and a space at the end is on
the way to the next word. A debt with no name is shown as "Debt 3" but left empty in its own field.

## Consequences

- A link reproduces the plan exactly, and a round-trip test checks that any scenario survives being written and read.
- Nothing leaves the browser. There is nothing to store, secure or delete.
- A very long plan makes a long link, but eight debts at most keep it short.
