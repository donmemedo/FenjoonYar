import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

// `.press` (globals.css) owns the transition and the 0.97 press feedback: instant on pointer-down,
// a softer return, and only the properties that change (never `transition: all`).
const base =
  "press inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:opacity-50";

const variants = {
  // Ink on the orange gradient: white fails WCAG AA there.
  primary:
    "bg-gradient-to-r from-brand to-brand2 text-on-brand shadow-[0_16px_40px_-18px_rgba(255,107,26,0.9)] hover:-translate-y-0.5",
  ghost: "border border-line bg-surface2/50 text-ink hover:border-brand-ink/50 hover:-translate-y-0.5",
  dark: "bg-ink text-bg hover:-translate-y-0.5",
} as const;

const sizes = {
  sm: "h-11 px-4 text-sm",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-8 text-base",
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`glass rounded-3xl ${className}`}>{children}</div>;
}

export function Badge({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "mint" | "muted" }) {
  // Text uses the -ink tokens (AA on the page and on their own tint); the raw brand colours are fills only.
  const tones = {
    brand: "border-brand/30 bg-brand/10 text-brand-ink",
    mint: "border-mint/30 bg-mint/10 text-mint-ink",
    muted: "border-line bg-surface2/60 text-muted",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Forward arrow that flips in RTL. Decorative. */
export function Arrow({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} rtl:rotate-180`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** 8-digit codes read as two groups of four ("40821537" -> "4082 1537"). Anything else is left alone. */
export const groupCode = (code: string) => (code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code);

/** Stagger for the `.rise` entrance (plain CSS, so above-the-fold content never waits for JavaScript). */
export const riseDelay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function SectionTitle({
  eyebrow,
  title,
  sub,
  center = true,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  center?: boolean;
  as?: "h1" | "h2";
}) {
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-2xl`}>
      {/* .eyebrow adds uppercase + tracking only under :lang(en); Persian is never letter-spaced. */}
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <Heading className="t-title text-3xl font-black sm:text-4xl md:text-5xl">{title}</Heading>
      {sub ? <p className="mt-4 text-base leading-relaxed text-muted">{sub}</p> : null}
    </div>
  );
}
