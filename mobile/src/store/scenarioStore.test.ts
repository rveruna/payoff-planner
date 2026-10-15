import * as SecureStore from 'expo-secure-store';
import { DEFAULT_SCENARIO, MAX_DEBTS, MAX_EXTRA } from '@domain/scenario';
import { resetStore, saved, savedState } from '@/test/helpers';
import { STORAGE_KEY, createScenarioStore, useScenarioStore } from './scenarioStore';
import { DEFAULT_SETTINGS, MAX_REMINDER_DAY, parseSettings } from './settings';

const store = () => useScenarioStore.getState();
const debt = { name: 'Card', balance: 100_000, aprBp: 2400, minPayment: 5_000 };

beforeEach(resetStore);

describe('a fresh start', () => {
  it('has the invented sample debts, the sample extra and avalanche', () => {
    expect(store().debts).toEqual(DEFAULT_SCENARIO.debts);
    expect(store().extra).toBe(DEFAULT_SCENARIO.extra);
    expect(store().strategy).toBe('avalanche');
    expect(store().settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('debts', () => {
  it('adds a debt, and gives it an id that is not used by another', () => {
    const id = store().addDebt(debt)!;

    expect(store().debts.at(-1)).toEqual({ id, ...debt });
    expect(new Set(store().debts.map((d) => d.id)).size).toBe(store().debts.length);
  });

  it('gives each new debt a different id', () => {
    const a = store().addDebt(debt);
    const b = store().addDebt(debt);
    expect(a).not.toBe(b);
  });

  it(`stops at ${MAX_DEBTS} debts and says so by returning null`, () => {
    while (store().debts.length < MAX_DEBTS) store().addDebt(debt);

    expect(store().addDebt(debt)).toBeNull();
    expect(store().debts).toHaveLength(MAX_DEBTS);
  });

  it('changes only the fields given, on only that debt', () => {
    const [first, second] = store().debts;

    store().updateDebt(first!.id, { balance: 12_345 });

    expect(store().debts[0]).toEqual({ ...first, balance: 12_345 });
    expect(store().debts[1]).toEqual(second);
  });

  it('removes a debt', () => {
    const [first] = store().debts;
    store().removeDebt(first!.id);
    expect(store().debts.find((d) => d.id === first!.id)).toBeUndefined();
    expect(store().debts).toHaveLength(DEFAULT_SCENARIO.debts.length - 1);
  });

  it('ignores a change to a debt that is not there', () => {
    const before = store().debts;
    store().updateDebt('nope', { balance: 1 });
    expect(store().debts).toEqual(before);
  });
});

describe('the extra payment and the strategy', () => {
  it('keeps the extra in whole pence and inside its limits', () => {
    store().setExtra(1234.6);
    expect(store().extra).toBe(1235);
    store().setExtra(-50);
    expect(store().extra).toBe(0);
    store().setExtra(MAX_EXTRA * 5);
    expect(store().extra).toBe(MAX_EXTRA);
  });

  it('sets the strategy', () => {
    store().setStrategy('snowball');
    expect(store().strategy).toBe('snowball');
  });
});

describe('replacing and resetting', () => {
  it('replaces the debts, the extra and the strategy together, and leaves the settings', () => {
    store().updateSettings({ appLock: true });
    store().replaceScenario({ debts: [{ id: 'x', ...debt }], extra: 0, strategy: 'minimum' });

    expect(store().debts).toEqual([{ id: 'x', ...debt }]);
    expect([store().extra, store().strategy]).toEqual([0, 'minimum']);
    expect(store().settings.appLock).toBe(true);
  });

  it('goes back to the sample debts and extra', () => {
    store().clearAll();
    store().resetToSample();

    expect(store().debts).toEqual(DEFAULT_SCENARIO.debts);
    expect(store().extra).toBe(DEFAULT_SCENARIO.extra);
  });

  it('clears everything: no debts, no extra, default settings', () => {
    store().updateSettings({ appLock: true, remindersEnabled: true });
    store().clearAll();

    expect(store().debts).toEqual([]);
    expect(store().extra).toBe(0);
    expect(store().settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('settings', () => {
  it('are checked as they are changed', () => {
    store().updateSettings({ reminderDay: 15 });
    expect(store().settings.reminderDay).toBe(15);

    store().updateSettings({ reminderDay: 99 });
    expect(store().settings.reminderDay).toBe(1);

    store().updateSettings({ reminderDay: MAX_REMINDER_DAY });
    expect(store().settings.reminderDay).toBe(MAX_REMINDER_DAY);
  });

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['text', 'hello'],
    ['the wrong types', { remindersEnabled: 'yes', reminderDay: '5', appLock: 1 }],
    ['a day out of range', { remindersEnabled: true, reminderDay: 31, appLock: true }],
  ])('fall back to the defaults for %s', (_name, value) => {
    const parsed = parseSettings(value);
    expect(parsed.reminderDay).toBeGreaterThanOrEqual(1);
    expect(parsed.reminderDay).toBeLessThanOrEqual(MAX_REMINDER_DAY);
    expect(typeof parsed.remindersEnabled).toBe('boolean');
    expect(typeof parsed.appLock).toBe('boolean');
  });

  it('keeps the valid ones when others are damaged', () => {
    expect(parseSettings({ remindersEnabled: true, reminderDay: 'x', appLock: 'maybe' })).toEqual({
      remindersEnabled: true,
      reminderDay: 1,
      appLock: false,
    });
  });
});

describe('saving', () => {
  it('writes to secure storage under one key, in the form of a shared link, with the settings', async () => {
    store().addDebt(debt);
    store().setStrategy('snowball');
    await new Promise((r) => setTimeout(r, 0));

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    const data = savedState()!;
    expect(data.version).toBe(1);
    expect(decodeURIComponent(data.state.scenario)).toContain('Card~100000~2400~5000');
    expect(data.state.scenario).toContain('s=snowball');
    expect(data.state.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('does not save anything that is not part of the scenario or the settings', async () => {
    store().addDebt(debt);
    await new Promise((r) => setTimeout(r, 0));

    expect(Object.keys(savedState()!.state).sort()).toEqual(['scenario', 'settings']);
  });

  it('saves an empty list of debts so they do not come back as the sample', async () => {
    store().clearAll();
    await new Promise((r) => setTimeout(r, 0));

    expect(savedState()!.state.scenario).toContain('d=');
    await useScenarioStore.persist.rehydrate();
    expect(store().debts).toEqual([]);
  });
});

describe('loading what was saved', () => {
  const save = (state: unknown) => saved.set(STORAGE_KEY, JSON.stringify({ state, version: 1 }));

  it('restores the debts, the extra, the strategy and the settings', async () => {
    save({
      scenario: '?d=Loan~250000~800~9000&x=3000&s=snowball',
      settings: { remindersEnabled: true, reminderDay: 12, appLock: true },
    });

    await useScenarioStore.persist.rehydrate();

    expect(store().debts).toEqual([
      { id: 'd0', name: 'Loan', balance: 250_000, aprBp: 800, minPayment: 9_000 },
    ]);
    expect([store().extra, store().strategy]).toEqual([3_000, 'snowball']);
    expect(store().settings).toEqual({ remindersEnabled: true, reminderDay: 12, appLock: true });
    expect(store().hydrated).toBe(true);
  });

  it.each([
    ['a scenario that is not text', { scenario: 42, settings: {} }],
    ['nothing at all', {}],
    ['scenario text that is rubbish', { scenario: '?d=%%%&x=banana&s=gamble', settings: 'nope' }],
  ])('does not crash on %s, and falls back to the defaults', async (_name, state) => {
    save(state);

    await expect(useScenarioStore.persist.rehydrate()).resolves.not.toThrow();

    expect(store().debts).toEqual(DEFAULT_SCENARIO.debts);
    expect(store().strategy).toBe('avalanche');
    expect(store().settings).toEqual(DEFAULT_SETTINGS);
  });

  it('skips a saved debt that is not in the expected shape and keeps the good ones', async () => {
    save({ scenario: '?d=Bad~lots~2400~5000&d=Good~100000~2400~5000', settings: {} });

    await useScenarioStore.persist.rehydrate();

    expect(store().debts.map((d) => d.name)).toEqual(['Good']);
  });

  it('marks the store as loaded even when nothing was saved', async () => {
    useScenarioStore.setState({ hydrated: false });
    await useScenarioStore.persist.rehydrate();
    expect(store().hydrated).toBe(true);
  });
});

describe('with storage that answers at once, as in a browser', () => {
  /** localStorage-like: every call returns straight away, not a promise. */
  const syncStorage = (initial?: string) => {
    const data = new Map<string, string>(initial ? [[STORAGE_KEY, initial]] : []);
    return {
      data,
      backing: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
        removeItem: (key: string) => void data.delete(key),
      },
    };
  };

  it('is marked as loaded, so the app does not wait for ever', async () => {
    const { backing } = syncStorage();
    const store = createScenarioStore(backing);

    await Promise.resolve();

    expect(store.getState().hydrated).toBe(true);
  });

  it('restores what was saved before anything is drawn', async () => {
    const { backing } = syncStorage(
      JSON.stringify({
        state: { scenario: '?d=Loan~250000~800~9000&s=snowball', settings: { appLock: true } },
        version: 1,
      }),
    );
    const store = createScenarioStore(backing);

    await Promise.resolve();

    expect(store.getState().debts.map((d) => d.name)).toEqual(['Loan']);
    expect(store.getState().strategy).toBe('snowball');
    expect(store.getState().settings.appLock).toBe(true);
    expect(store.getState().hydrated).toBe(true);
  });

  it('saves changes straight away', () => {
    const { backing, data } = syncStorage();
    const store = createScenarioStore(backing);

    store.getState().setStrategy('minimum');

    expect(JSON.parse(data.get(STORAGE_KEY)!).state.scenario).toContain('s=minimum');
  });
});

describe('the reminder day', () => {
  it('can be any day up to the 28th, so it falls in every month, and no later', () => {
    expect(MAX_REMINDER_DAY).toBe(28);
    expect(parseSettings({ reminderDay: 28 }).reminderDay).toBe(28);
    expect(parseSettings({ reminderDay: 29 }).reminderDay).toBe(1);
  });
});
