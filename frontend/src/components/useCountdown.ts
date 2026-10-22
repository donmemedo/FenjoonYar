"use client";

import { useEffect, useReducer } from "react";

/**
 * Whole seconds until `endsAt` (epoch ms), 0 when null or already past. The value is recomputed from
 * the clock on every render, so a throttled background tab catches up the moment it is visible again.
 * Ticks once a second and stops by itself at zero.
 */
export function useCountdown(endsAt: number | null): number {
  const [, tick] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (endsAt === null || Date.now() >= endsAt) return;
    const id = setInterval(() => {
      tick();
      if (Date.now() >= endsAt) clearInterval(id);
    }, 1000);
    const onVisible = () => !document.hidden && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [endsAt]);

  return endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}
