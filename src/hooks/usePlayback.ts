import { useEffect, useState } from 'react';

/**
 * Steps a month number forward on a timer, for playing a plan through. It stops by itself at the last month, and
 * pressing play again at the end starts over from the first.
 */
export function usePlayback(
  month: number,
  last: number,
  setMonth: (month: number) => void,
  intervalMs = 140,
) {
  const [playing, setPlaying] = useState(false);
  const running = playing && month < last;

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => {
      setMonth(month + 1);
      if (month + 1 >= last) setPlaying(false);
    }, intervalMs);
    return () => window.clearTimeout(id);
  }, [running, month, last, setMonth, intervalMs]);

  return {
    playing: running,
    toggle: () => {
      if (running) return setPlaying(false);
      if (month >= last) setMonth(1);
      setPlaying(true);
    },
    stop: () => setPlaying(false),
  };
}
