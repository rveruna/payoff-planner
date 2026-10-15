import { useEffect, useRef, useState } from 'react';

/** Eases from the previous value to the target over a short time, or gives the target straight away when asked not to animate. */
export function useAnimatedNumber(target: number, animate: boolean, durationMs = 450): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    if (!animate) {
      from.current = target;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const value = Math.round(origin + (target - origin) * eased);
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, animate, durationMs]);

  return animate ? shown : target;
}
