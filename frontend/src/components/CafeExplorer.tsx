"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";

import CafeCard from "@/components/CafeCard";
import type { Cafe } from "@/lib/api";
import { fill, foldText, formatNumber, getCopy, type Locale } from "@/lib/i18n";

export default function CafeExplorer({ cafes, locale }: { cafes: Cafe[]; locale: Locale }) {
  const copy = getCopy(locale);
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [tag, setTag] = useState("");
  // The input stays instant; the list filters on the deferred value so typing is never blocked by rendering.
  const deferredQuery = useDeferredValue(query);

  const cities = useMemo(() => Array.from(new Set(cafes.map((c) => c.city[locale]))), [cafes, locale]);
  const tags = useMemo(() => Array.from(new Set(cafes.flatMap((c) => c.tags))), [cafes]);
  const tagLabels = copy.cafes.tags as Record<string, string>;

  const shown = useMemo(() => {
    // foldText also maps Persian/Arabic digits and letter variants, so either keyboard finds the cafe.
    const q = foldText(deferredQuery);
    return cafes.filter(
      (c) =>
        (!q || foldText(`${c.name[locale]} ${c.area[locale]} ${c.address[locale]}`).includes(q)) &&
        (!city || c.city[locale] === city) &&
        (!tag || c.tags.includes(tag)),
    );
  }, [cafes, locale, deferredQuery, city, tag]);

  const chip = (active: boolean) =>
    `press min-h-11 rounded-full border px-4 py-2 text-sm font-bold ${
      active
        ? "border-brand bg-brand text-on-brand"
        : "border-line bg-surface2/60 text-muted hover:border-brand-ink/40 hover:text-ink"
    }`;

  return (
    <>
      <div className="glass mt-10 rounded-3xl p-5">
        <label htmlFor={searchId} className="sr-only">{copy.cafes.searchLabel}</label>
        <div className="relative">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute inset-y-0 start-4 my-auto h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            id={searchId}
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.cafes.searchPlaceholder}
            autoComplete="off"
            enterKeyHint="search"
            maxLength={64}
            className="field h-14 ps-12 pe-4 text-base"
          />
        </div>

        <div role="group" aria-label={copy.cafes.city} className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={chip(!city)} aria-pressed={!city} onClick={() => setCity("")}>
            {copy.common.all}
          </button>
          {cities.map((c) => (
            <button key={c} type="button" className={chip(city === c)} aria-pressed={city === c} onClick={() => setCity(c)}>
              {c}
            </button>
          ))}
        </div>
        <div role="group" aria-label={copy.cafes.tag} className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={chip(!tag)} aria-pressed={!tag} onClick={() => setTag("")}>
            {copy.common.all}
          </button>
          {tags.map((t) => (
            <button key={t} type="button" className={chip(tag === t)} aria-pressed={tag === t} onClick={() => setTag(t)}>
              {tagLabels[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      {/* Polite live region: the result count is announced after typing or filtering, not on every keystroke render. */}
      <p role="status" className="mt-6 text-sm font-bold text-muted">
        {fill(copy.cafes.count, { n: formatNumber(shown.length, locale) })}
      </p>

      {shown.length ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((cafe) => (
            <CafeCard key={cafe.slug} cafe={cafe} locale={locale} as="h2" />
          ))}
        </div>
      ) : (
        <p className="glass mt-4 rounded-3xl p-10 text-center font-bold text-muted">{copy.cafes.empty}</p>
      )}
    </>
  );
}
