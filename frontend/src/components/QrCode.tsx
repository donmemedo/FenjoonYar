"use client";

import { useEffect, useState } from "react";

/** `label` is the accessible name (the QR itself carries the same 8-digit code that is shown as text next to it). */
export default function QrCode({ value, label, size = 220 }: { value: string; label: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // The encoder is ~25 KB: loaded only when a code is actually on screen, not in the page bundle.
    import("qrcode")
      .then((m) =>
        m.toDataURL(value, { width: size * 2, margin: 1, color: { dark: "#1b1210ff", light: "#ffffffff" } }),
      )
      .then((url) => alive && setSrc(url))
      .catch(() => {}); // the code is also shown as text, so a failed QR is not fatal
    return () => {
      alive = false;
    };
  }, [value, size]);

  return (
    <div
      className="grid place-items-center rounded-3xl bg-white p-3 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.6)]"
      style={{ width: size + 24, height: size + 24 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} width={size} height={size} className="rounded-xl" />
      ) : (
        <div role="img" aria-label={label} aria-busy="true" className="h-full w-full rounded-xl bg-black/5" />
      )}
    </div>
  );
}
