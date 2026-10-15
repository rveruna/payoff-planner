# Payoff Planner: the app

A multi-screen React Native app (Expo SDK 57, Expo Router) for the [Payoff Planner](../README.md). It uses the same exact-pence
engine as the web version, imported from `../src/domain` and not copied.

**[Try the web build](https://rveruna.github.io/payoff-planner/app/)**. It is the same code run through react-native-web.

> **What this has not had:** it has never been run on an iOS or Android simulator or a phone, because the machine it was built
> on has neither Xcode nor the Android SDK. It is tested with Jest screen and navigation tests, bundled for iOS and Android
> (Hermes) on every push, and run in real Chrome as a web app with axe. The native modules (secure storage, biometrics,
> notifications) are mocked in the tests. See [decision 0010](../docs/decisions/0010-what-has-and-has-not-been-run.md).

## Screens

| Route              | What it is                                                                          |
| ------------------ | ----------------------------------------------------------------------------------- |
| `/` (Debts tab)    | Your debts, add one, use the sample debts                                           |
| `/plan` (Plan tab) | Debt-free date, the extra to pay, three strategies, the race and stacked charts     |
| `/settings`        | Monthly reminder and its day, app lock, share a link, delete all data (tap twice)   |
| `/debt/[id]`       | Add or edit a debt: React Hook Form and Zod, with the same parsers as the web app   |
| `/schedule`        | Every month of the plan in a list                                                   |
| `/month/[n]`       | Show your working for one month, with previous and next                             |
| `/import`          | Opens a web planner link (`?d=...`) or a `payoff://import?...` link, and asks first |

## Run it

```bash
cd mobile
npm install
npm start              # then press i, a or w; needs Xcode, Android Studio or a browser
npm test               # 215 tests
npm run test:coverage  # 97.6% statements, 92.6% branches
npm run lint && npm run typecheck && npm run format:check
npm run bundle:native  # compiles for iOS and Android without a simulator
npm run build:web      # then: npm run e2e (Playwright and axe, needs a browser)
```

## How it is built

- **Expo Router** file-based routes, tabs plus a stack, with a not-found screen and deep links.
- **Zustand** with `persist` for the plan and for settings; secure storage on a phone, `localStorage` on the web.
- **React Hook Form with Zod** for the debt form.
- **Charts** in `react-native-svg`, drawn from the same pure chart maths as the web app. Each is one adjustable control for a
  screen reader (swipe up or down to change the month), and can also be dragged.
- **Biometric app lock** and **monthly local notification**, both optional, neither available on the web.
- Shared code: the engine, link format, money and chart maths come from `../src/domain` through a TypeScript path and Metro
  `watchFolders` ([0007](../docs/decisions/0007-an-expo-app-that-shares-the-engine.md)).

## Tests

- `src/__tests__` renders whole screens through Expo Router's testing library and navigates between them.
- `src/lib` and `src/store` unit-test the helpers, the schema, the stores, the lock and the reminders.
- `e2e/run.mjs` drives the web export in Chrome (add a debt and reload, a shared link, the plan, an unknown address) and then
  runs axe on each tab at four widths, checking for sideways scroll.
- Hand-made mutants of the store, schema, lock, reminders and link were all caught.

## Limits

- Not run on a device or simulator; no screen reader testing; no Maestro, Detox or EAS build.
- The tab bar is drawn by the navigation library outside a landmark, and the end-to-end check names that one accepted axe finding.
- Same simple model and not-financial-advice caveats as the web version.
