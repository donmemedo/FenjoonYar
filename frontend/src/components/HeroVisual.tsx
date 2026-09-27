import { formatNumber, getCopy, type Locale } from "@/lib/i18n";

export default function HeroVisual({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-10 -z-10 rounded-full bg-gradient-to-br from-brand/40 via-brand2/30 to-violet/30 blur-3xl animate-pulse-glow" />

      {/* floating wallet card */}
      <div className="glass animate-float rounded-4xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted">{copy.app.wallet}</p>
            <p className="mt-1 text-4xl font-black tracking-tight">
              {formatNumber(7, locale)}
              <span className="ms-2 text-base font-bold text-muted">{copy.common.cups}</span>
            </p>
          </div>
          <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand2">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 10h10v5a5 5 0 0 1-5 5 5 5 0 0 1-5-5v-5Z" strokeLinejoin="round" />
              <path d="M16 11h1.6a2.4 2.4 0 1 1 0 4.8H16" strokeLinecap="round" />
            </svg>
            <span className="absolute -top-1.5 h-3 w-0.5 rounded bg-white/70 animate-steam" />
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface2">
          <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-brand to-brand2" />
        </div>

        {/* QR block */}
        <div className="mt-6 rounded-3xl bg-surface2/70 p-4">
          <p className="text-center text-[11px] font-bold text-muted">{copy.app.codeTitle}</p>
          <div className="mx-auto mt-3 grid h-28 w-28 grid-cols-7 gap-0.5">
            {Array.from({ length: 49 }).map((_, i) => (
              <span
                key={i}
                className={`rounded-[2px] ${
                  [0, 1, 2, 5, 6, 7, 9, 12, 14, 16, 18, 21, 23, 24, 27, 30, 33, 34, 36, 40, 42, 45, 47, 48].includes(i)
                    ? "bg-ink"
                    : "bg-transparent"
                }`}
              />
            ))}
          </div>
          <p className="mt-3 text-center font-mono text-xl font-black tracking-[0.35em] text-brand">
            {formatNumber(408215, locale)}
          </p>
        </div>
      </div>

      {/* floating chips */}
      <div className="glass absolute -start-6 top-10 hidden rounded-2xl px-4 py-3 text-xs font-bold shadow-lg sm:block animate-float [animation-delay:1.2s]">
        ☕ {copy.app.status.confirmed}
      </div>
      <div className="glass absolute -end-4 bottom-16 hidden rounded-2xl px-4 py-3 text-xs font-bold shadow-lg sm:block animate-float [animation-delay:2.4s]">
        {copy.hero.note}
      </div>
    </div>
  );
}
