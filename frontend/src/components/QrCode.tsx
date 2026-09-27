"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: "#1b1210ff", light: "#ffffffff" },
    })
      .then((url) => alive && setSrc(url))
      .catch(() => {});
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
        <img src={src} alt="QR" width={size} height={size} className="rounded-xl" />
      ) : (
        <div className="h-full w-full animate-pulse rounded-xl bg-black/5" />
      )}
    </div>
  );
}
