"use client";

import { useMemo, useState } from "react";

import CafeCard from "@/components/CafeCard";
import Reveal from "@/components/Reveal";
import type { Cafe } from "@/lib/api";
import { getCopy, type Locale } from "@/lib/i18n";

export default function CafeExplorer({ cafes, locale }: { cafes: Cafe[]; locale: Locale }) {
  const copy = getCopy(locale);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [tag, setTag] = useState("");

  const cities = useMemo(
    () => Array.from(new Set(cafes.map((c) => c.city[locale]))),
    [cafes, locale],
  );
  const tags = useMemo(
    () => Array.from(new Set(cafes.flatMap((c) => c.tags))),
    [cafes],
  );
  const tagLabels = copy.cafes.tags as Record<string, string>;

  const shown = cafes.filter((c) => {
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q ||
      c.name[locale].toLowerCase().includes(q) ||
      c.area[locale].toLowerCase().includes(q) ||
      c.address[locale].toLowerCase().includes(q);
    return matchQuery && (!city || c.city[locale] === city) && (!tag || c.tags.includes(tag));
  });

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-bold transition ${
      active
        ? "border-brand bg-brand text-white shadow-[0_12px_30px_-14px_rgba(255,107,26,1)]"
        : "border-line bg-surface2/60 text-muted hover:border-brand/40 hover:text-ink"
    }`;

  return (
    <>
      <div className="glass mt-10 rounded-3xl p-5">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute inset-y-0 start-4 my-auto h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.cafes.searchPlaceholder}
            className="h-14 w-full rounded-2xl border border-line bg-surface2/50 px-12 text-base font-semibold outline-none transition focus:border-brand/60 focus:ring-4 focus:ring-brand/15"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className={chip(!city)} onClick={() => setCity("")}>{copy.common.all}</button>
          {cities.map((c) => (
            <button key={c} className={chip(city === c)} onClick={() => setCity(c)}>{c}</button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={chip(!tag)} onClick={() => setTag("")}>{copy.cafes.tag}</button>
          {tags.map((t) => (
            <button key={t} className={chip(tag === t)} onClick={() => setTag(t)}>{tagLabels[t] ?? t}</button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((cafe, i) => (
            <Reveal key={cafe.slug} delay={Math.min(i, 6) * 70}>
              <CafeCard cafe={cafe} locale={locale} />
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="glass mt-8 rounded-3xl p-10 text-center font-bold text-muted">{copy.cafes.empty}</p>
      )}
    </>
  );
}
