# 0007: An Expo app that shares the engine, not a copy of it

Status: accepted

## Context

The web planner is one screen. I wanted a multi-screen React Native app too: navigation, forms, local storage, a lock and
reminders. The money engine in `src/domain` is plain TypeScript with no DOM or React in it, and it is the part that must never
disagree with itself. Copying it into a second project would let the two drift; publishing it as a package is a lot of
machinery for one person and two consumers.

## Decision

- The app lives in `mobile/` in the same repository. It imports `src/domain` directly, through a TypeScript path
  (`@domain/*`) and Metro's `watchFolders`, so there is one engine, one set of 273 web tests and one set of property tests.
- Anything the web app owned that the app also needs moved down into the domain (`monthTicks`, `shortMonth`) and the web app
  imports it from there. The domain imports nothing from either app.
- `zod` is resolved from `mobile/node_modules` for the shared files (`extraNodeModules` and a path), so the shared code does not
  need the web project's `node_modules` to be installed.
- The two projects have their own lock files, their own lint, format and test runs, and two CI jobs. The root lint, format and
  test configuration ignore `mobile/`.
- The app opens the same share links as the web planner (`?d=...&x=...&s=...`), and its own `payoff://` links, so a plan can be
  moved between them. The app's saved plan uses the same text form.

## Consequences

- A change to the engine is tested once, in the web suite, and exercised again by the app's tests.
- The repository root is both the web project and the parent of the app, which is slightly unusual. A workspaces setup would
  be tidier; I did not want to move the web app that is already live and well tested to get it.
- Metro needs to be told about the shared folder, and if it is moved the app will fail to bundle (CI bundles for iOS and Android
  on every push, so that is caught).
