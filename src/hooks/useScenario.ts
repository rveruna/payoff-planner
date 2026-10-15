import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { parseScenario, scenarioToSearch, type Scenario } from '../domain/scenario';

const CHANGE_EVENT = 'payoff-scenario-change';

function subscribe(listener: () => void): () => void {
  window.addEventListener('popstate', listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

const getSearch = () => window.location.search;

/**
 * The scenario, kept in the URL query string so a link reproduces it exactly. There is no server and no account: the
 * address is the whole saved state.
 */
export function useScenario(): [Scenario, (patch: Partial<Scenario>) => void] {
  const search = useSyncExternalStore(subscribe, getSearch);
  const scenario = useMemo(() => parseScenario(search), [search]);

  const update = useCallback((patch: Partial<Scenario>) => {
    const next = { ...parseScenario(window.location.search), ...patch };
    const url = `${window.location.pathname}${scenarioToSearch(next)}${window.location.hash}`;
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [scenario, update];
}
