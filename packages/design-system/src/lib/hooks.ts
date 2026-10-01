import { useEffect, useRef, useState } from "react";
import { useUI } from "./provider";

/** Seconds remaining until `target`, ticking every second. Calls `onExpire` once at zero. */
export function useCountdown(target: string | number | Date, onExpire?: () => void) {
  const { now } = useUI();
  const targetMs = new Date(target).getTime();
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((targetMs - now()) / 1000)));
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    expired.current = false;
    const tick = () => {
      const next = Math.max(0, Math.ceil((targetMs - now()) / 1000));
      setRemaining(next);
      if (next === 0 && !expired.current) {
        expired.current = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs, now]);

  return remaining;
}
