import { formatNumber, getCopy, type Locale } from "@/lib/i18n";

// Which of the 7x7 cells are filled: a QR-like pattern, purely decorative.
const FILLED = new Set([0, 1, 2, 5, 6, 7, 9, 12, 14, 16, 18, 21, 23, 24, 27, 30, 33, 34, 36, 40, 42, 45, 47, 48]);

/**
 * Decorative mock of the wallet and code screens. Everything in it is sample content, so the whole
 * block is hidden from assistive tech and labelled as a sample for sighted users.
 */
export default function HeroVisual({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm">
      {/* Soft radial gradient instead of a blurred layer: nothing to re-rasterise. */}
      <div className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(255,107,26,0.3),rgba(124,92,255,0.12)_65%,transparent)]" />

      {/* Floats only on large screens, and never under prefers-reduced-motion (globals.css). */}
      <div className="glass rounded-4xl p-6 lg:animate-float">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted">{copy.app.wallet}</p>
            <p className="mt-1 text-4xl font-black">
              {formatNumber(7, locale)}
              <span className="ms-2 text-base font-bold text-muted">{copy.common.cups}</span>
            </p>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand2">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-on-brand" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 10h10v5a5 5 0 0 1-5 5 5 5 0 0 1-5-5v-5Z" strokeLinejoin="round" />
              <path d="M16 11h1.6a2.4 2.4 0 1 1 0 4.8H16" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface2">
          <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-brand to-brand2" />
        </div>

        <div className="mt-6 rounded-3xl bg-surface2/70 p-4">
          <p className="text-center text-[11px] font-bold text-muted">{copy.app.codeTitle}</p>
          <div className="mx-auto mt-3 grid h-28 w-28 grid-cols-7 gap-0.5">
            {Array.from({ length: 49 }, (_, i) => (
              <span key={i} className={`rounded-[2px] ${FILLED.has(i) ? "bg-ink" : "bg-transparent"}`} />
            ))}
          </div>
          {/* Eight digits, grouped 4 + 4, like the real code. */}
          <p dir="ltr" className="code-display mt-3 text-center text-xl text-brand-ink">4082 1537</p>
          <p className="mt-2 text-center text-[11px] font-semibold text-muted">{copy.common.sample}</p>
        </div>
      </div>

      <div className="glass absolute -start-6 top-10 hidden rounded-2xl px-4 py-3 text-xs font-bold shadow-lg sm:block lg:animate-float [animation-delay:1.2s]">
        ☕ {copy.app.status.confirmed}
      </div>
      <div className="glass absolute -end-4 bottom-16 hidden rounded-2xl px-4 py-3 text-xs font-bold shadow-lg sm:block lg:animate-float [animation-delay:2.4s]">
        {copy.hero.note}
      </div>
    </div>
  );
}
