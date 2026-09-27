import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  primary:
    "bg-gradient-to-r from-brand to-brand2 text-white shadow-[0_16px_40px_-18px_rgba(255,107,26,0.9)] hover:shadow-[0_22px_55px_-18px_rgba(255,107,26,1)] hover:-translate-y-0.5",
  ghost: "border border-line bg-surface2/50 text-ink hover:border-brand/50 hover:-translate-y-0.5",
  dark: "bg-ink text-bg hover:-translate-y-0.5",
} as const;

const sizes = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-8 text-base",
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
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

export function Badge({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "mint" | "violet" | "muted" }) {
  const tones = {
    brand: "border-brand/30 bg-brand/10 text-brand",
    mint: "border-mint/30 bg-mint/10 text-mint",
    violet: "border-violet/30 bg-violet/10 text-violet",
    muted: "border-line bg-surface2/60 text-muted",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  sub,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-2xl`}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-brand">{eyebrow}</p>
      ) : null}
      <h2 className="text-3xl font-black leading-tight sm:text-4xl md:text-5xl">{title}</h2>
      {sub ? <p className="mt-4 text-base leading-relaxed text-muted">{sub}</p> : null}
    </div>
  );
}
