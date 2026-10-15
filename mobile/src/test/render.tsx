import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

type Rendering = ReturnType<typeof renderRouter>;
let current: Rendering | null = null;

/**
 * Renders the real routes in the app folder, starting at the given address. The router's helpers for reading the current
 * address are attached to the promise that renderRouter returns, so that is what is kept, and awaited.
 */
export async function renderApp(initialUrl = '/') {
  const rendering = renderRouter('./app', { initialUrl });
  current = rendering;
  return await rendering;
}

/** The address the app is showing now, such as "/plan" or "/debt/d4". */
export const pathname = () => (current as unknown as { getPathname: () => string }).getPathname();

/** The query parameters of the address the app is showing now. */
export const searchParams = () =>
  (current as unknown as { getSearchParams: () => Record<string, unknown> }).getSearchParams();

/** Presses a tab in the bottom bar, found by the name a screen reader gives it, such as "Plan, tab, 2 of 3". */
export async function openTab(name: 'Debts' | 'Plan' | 'Settings') {
  await fireEvent.press(await screen.findByLabelText(new RegExp(`^${name}, tab`)));
}
