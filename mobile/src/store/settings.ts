import { z } from 'zod';

export const MIN_REMINDER_DAY = 1;
/** Capped at 28 so the reminder falls in every month. */
export const MAX_REMINDER_DAY = 28;

/** What the person has chosen in Settings. Anything missing or not recognised falls back to its default. */
export const settingsSchema = z.object({
  remindersEnabled: z.boolean().catch(false),
  reminderDay: z.number().int().min(MIN_REMINDER_DAY).max(MAX_REMINDER_DAY).catch(1),
  appLock: z.boolean().catch(false),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

/** Reads settings from whatever was stored, which may be old, damaged or not what we expect. */
export function parseSettings(value: unknown): Settings {
  return settingsSchema.parse(value && typeof value === 'object' ? value : {});
}
