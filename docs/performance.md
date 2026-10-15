# Performance

Measured with `npm run perf:lighthouse` (median of 3 runs, mobile emulation, simulated Slow 4G, Chrome) on a production build.
The planner makes no network requests at all, so the numbers describe the app itself.

| Measure                            | Result                 |
| ---------------------------------- | ---------------------- |
| Performance score                  | 100                    |
| Accessibility, best practices, SEO | 100, 100, 100          |
| First contentful paint             | 1.35 s                 |
| Largest contentful paint           | 1.5 s                  |
| Total blocking time                | 0 ms                   |
| Layout shift                       | 0                      |
| Page weight                        | 102 kB (scripts 99 kB) |

`npm run size` fails the build if the gzipped JavaScript passes 115 kB or the CSS passes 3 kB. Today's figures are 100.6 kB and
1.9 kB. Most of the JavaScript is React.

Working out all three plans takes about 0.14 ms for the sample debts and about 0.5 ms for eight debts (measured in Node), so they are
recalculated on every change, with no worker and no caching.

Not measured: a real phone, or how it feels on a slow device while a plan plays.
