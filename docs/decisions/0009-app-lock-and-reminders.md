# 0009: An optional lock, and reminders that say nothing

Status: accepted

## Context

Debts are private. People share phones, and a notification can be read on a lock screen.

## Decision

- **App lock is optional, and off by default.** It uses the phone's own fingerprint, face or passcode through
  `expo-local-authentication`. It is only offered if the phone has the hardware and something is set up; otherwise the switch is
  disabled and says why. When on, nothing is shown, not even the debts, until the person has been checked, and the app asks
  again after a minute in the background. Briefly switching away (the app going "inactive", as when a permission dialog or
  Control Centre opens) does not count.
- **The reminder is a monthly local notification** at 9am on a day the person chooses (1 to 28, so it falls in every month).
  Its text never contains an amount or a debt name. Turning it off, or changing the day, replaces the previous schedule.
- **Neither feature exists on the web**, and the settings screen says so rather than showing a switch that does nothing.

## Consequences

- The lock is a convenience, not encryption. The debts are in secure storage, but the lock does not protect against someone who
  can already unlock the phone with other means.
- Both features depend on native modules that I have only tested through mocks. See [0010](0010-what-has-and-has-not-been-run.md).
