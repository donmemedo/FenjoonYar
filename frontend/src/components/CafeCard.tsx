import { Badge } from "@/components/ui";
import { formatDecimal, getCopy, type Locale } from "@/lib/i18n";
import type { Cafe } from "@/lib/api";

const art: Record<string, string> = {
  beans: "from-brand/70 via-brand2/60 to-berry/50",
  roast: "from-violet/70 via-brand/50 to-brand2/60",
  cup: "from-mint/60 via-brand2/50 to-brand/60",
};

export default function CafeCard({ cafe, locale }: { cafe: Cafe; locale: Locale }) {
  const copy = getCopy(locale);
  const tagLabels = copy.cafes.tags as Record<string, string>;

  return (
    <article className="tilt group glass overflow-hidden rounded-3xl">
      <div className={`relative h-32 bg-gradient-to-br ${art[cafe.cover] ?? art.beans}`}>
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute inset-x-4 bottom-3 flex items-end justify-between">
          <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            {cafe.city[locale]} · {cafe.area[locale]}
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-black text-[#1b1210]">
            ★ {formatDecimal(cafe.rating, locale)}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-black transition group-hover:text-brand">{cafe.name[locale]}</h3>
        <p className="mt-1 text-sm text-muted">{cafe.address[locale]}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {cafe.tags.map((t) => (
            <Badge key={t} tone="muted">
              {tagLabels[t] ?? t}
            </Badge>
          ))}
        </div>
      </div>
    </article>
  );
}
