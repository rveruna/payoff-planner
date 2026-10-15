# 0010: What has and has not been run

Status: accepted

## Context

This project was built on a Mac with no Xcode, no Android SDK and no emulator, so the app has **never been run on an iOS or
Android simulator or on a phone**. A portfolio piece that implied otherwise would be false, so this record says what the
evidence is.

## What has been checked

| Check                                                                                                                                                                      | Where                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 215 Jest tests of screens and navigation (Expo Router's testing library, React Native Testing Library), 97.6% statements, 92.6% branches                                   | every push (CI)           |
| Hand-made mutants of the store, form schema, lock, reminders and share link: all caught                                                                                    | once, locally             |
| `expo export` for iOS and Android, so Metro and Hermes compile every screen                                                                                                | every push (CI)           |
| `expo-doctor`, ESLint, Prettier, `tsc`                                                                                                                                     | every push (CI)           |
| Web export in real Chrome: six journeys, then axe (WCAG 2.2 AA and best practice) on every screen at phone, small phone, tablet and desktop widths, and no sideways scroll | every push (CI), and live |

## What has not

- No simulator or device run. Native modules (secure storage, biometrics, notifications) are mocked in the tests; whether the
  permission prompts, the Face ID string, the notification channel and the keychain behave is **unverified**.
- No screen reader (VoiceOver, TalkBack) testing. Roles, labels and values are set and tested as props, and axe checks the web
  build, but that is not the same as listening to it.
- No Maestro or Detox flows, and no EAS build. `app.json` has bundle identifiers and plugins, and nothing has been submitted or
  installed.
- Dragging on the charts is tested by calling the responder handlers, not with a finger.

## Found by these checks

- Back or Cancel did nothing when a form was opened from a link (no screen behind it). Fixed with a helper that goes home.
- The web build was stuck on "Loading your plan" (see [0008](0008-state-forms-and-what-is-stored.md)).
- A hook was called after an early return in the debt form.
- The tab bar's labels were clipped on the web.
- On the web, axe found a radio group without `aria-checked`, charts used as sliders without a value, a switch whose role was
  doubled, and no main landmark. All fixed; the tab bar still sits outside a landmark because the navigation library draws it,
  and the end-to-end check names that one exception.

## Consequences

The next step that would change this record is a device run. Until then the honest summary is: logic and layout are well
covered, native behaviour is not.
