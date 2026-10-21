"use client";

import { useEffect, useRef } from "react";

import { useCountdown } from "@/components/useCountdown";
import { fill, formatClock, formatNumber, type Locale } from "@/lib/i18n";

const R = 44;
const C = 2 * Math.PI * R;

/**
 * Progress ring + countdown for a one-time code. The ring is redrawn once a second (no CSS animation).
 * Screen readers: the timer itself is not live, so it is never read every second; a separate polite
 * region changes only when the remaining whole minutes change (and once more at expiry).
 */
export default function CodeTimer({
  endsAt,
  total,
  locale,
  label,
  minutesText,
  expiredText,
  onExpire,
}: {
  endsAt: number;
  /** Full lifetime in seconds (the ring is 100% at this value). */
  total: number;
  locale: Locale;
  /** Accessible name of the timer. */
  label: string;
  /** Contains {n}: whole minutes left. */
  minutesText: string;
  expiredText: string;
  onExpire?: () => void;
}) {
  const left = useCountdown(endsAt);
  const expired = left === 0;
  const fraction = Math.min(1, left / Math.max(1, total));

  // Fires once per expiry, with the latest callback.
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    if (expired) expire.current?.();
  }, [expired]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div role="timer" aria-label={label} className="relative h-24 w-24">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" className="stroke-line" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - fraction)}
            className={left <= 60 ? "stroke-berry-ink" : "stroke-brand-ink"}
          />
        </svg>
        <span dir="ltr" className="absolute inset-0 grid place-items-center font-mono text-lg font-black tabular-nums">
          {formatClock(left, locale)}
        </span>
      </div>
      <p
        aria-live="polite"
        className={expired ? "text-center text-sm font-bold text-berry-ink" : "sr-only"}
      >
        {expired ? expiredText : fill(minutesText, { n: formatNumber(Math.ceil(left / 60), locale) })}
      </p>
    </div>
  );
}
