# 0008: Zustand, React Hook Form with Zod, and what is stored

Status: accepted

## Context

The app has to keep the person's debts between launches, validate a form that takes money and a rate as text, and decide what is
safe to keep on a phone.

## Decision

- **State is one small Zustand store** with the `persist` middleware, behind a factory (`createScenarioStore(backing)`) so tests
  can give it their own storage. Screens read the store and derive the plan with the shared engine; nothing computed is stored.
- **What is saved is the plan in its link text form**, and it is read back through the same defensive parser as a link from
  outside (see [0005](0005-the-link-is-the-saved-plan.md)). Damaged or old data cannot crash the app. If every saved debt is
  unreadable it falls back to the sample debts rather than showing an empty list the person did not choose.
- **Storage is the OS keychain/keystore** (`expo-secure-store`) on a phone, because the debts are personal. On the web, where
  there is no such thing, it is `localStorage`, selected by the `.web.ts` file suffix.
- **The debt form is React Hook Form with a Zod schema**. The form holds text, exactly as typed; the schema accepts it using the
  same money and percentage parsers as the web app, and only then is it converted to pence. The save button stays disabled
  until the form is valid.
- **Settings** (reminder on or off, day of month 1-28, app lock) are a second small store with a schema, and anything missing
  or unrecognised falls back to its default.

## Consequences

- Hydration is asynchronous on a phone and synchronous on the web. A first version set "loaded" synchronously and left the web
  build stuck on "Loading your plan"; the flag is now set on a microtask, and a test covers it.
- Secure storage can limit how large one value is, depending on the platform. The link text is compact, but I have not looked up
  the limits or tried a plan with dozens of debts on a device.
