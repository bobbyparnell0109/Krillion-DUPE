"use client";

/**
 * Countdown from `ms` while `running`. Calls onExpire once when it reaches zero.
 * Uses a deadline (not decrementing state) so throttled tabs stay accurate.
 */
import { useEffect, useRef, useState } from "react";

export function useCountdown(ms: number, running: boolean, onExpire: () => void, resetKey: string | number) {
  const [left, setLeft] = useState(ms);
  const deadline = useRef(0);
  const expired = useRef(false);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    deadline.current = Date.now() + ms;
    expired.current = false;
    setLeft(ms);
    // Only reset when a new prompt arrives (resetKey), not on every ms change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const remaining = Math.max(0, deadline.current - Date.now());
      setLeft(remaining);
      if (remaining <= 0 && !expired.current) {
        expired.current = true;
        expireRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [running, resetKey]);

  return left;
}
