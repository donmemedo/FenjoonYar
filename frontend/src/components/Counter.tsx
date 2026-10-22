"use client";

import { useEffect, useRef } from "react";

import { formatNumber, type Locale } from "@/lib/i18n";

// Below this the count-up is just noise ("0, 1, 2, 3" for three cafes).
const MIN_TO_ANIMATE = 20;

/**
 * Renders the real value on the server (so no-JS and crawlers see it) and, when it scrolls into view,
 * counts up by writing text straight into the node: no React re-render per frame. Skipped entirely
 * under prefers-reduced-motion. Screen readers get the final value only.
 */
export default function Counter({ value, locale }: { value: number; locale: Locale }) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = formatNumber(value, locale);

  useEffect(() => {
    const node = ref.current;
    if (node) node.textContent = final; // undo a half-finished count when the value changes
    if (!node || value < MIN_TO_ANIMATE || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const duration = 1200;
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        node.textContent = formatNumber(value * (1 - Math.pow(1 - p, 3)), locale);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, locale, final]);

  return (
    <span className="tabular-nums">
      <span ref={ref} aria-hidden="true">{final}</span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
