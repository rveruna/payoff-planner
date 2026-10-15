import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * Goes back one screen. If there is no screen behind this one, which happens when the app is opened straight onto it from
 * a link, a refresh or a notification, it goes to the debts list instead, so a button that says "back" always does something.
 */
export function leave(router: Router) {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
