import { getCopy, type Locale } from "@/lib/i18n";

type Doc = { title: string; sections: readonly { h: string; p: readonly string[] }[] };

/** Text in [square brackets] marks a decision still open: highlighted so it cannot be missed. */
function Marked({ text }: { text: string }) {
  return text.split(/(\[[^\]]+\])/).map((part, i) =>
    part.startsWith("[") ? (
      <mark key={i} className="rounded bg-brand/15 px-1 text-ink">{part}</mark>
    ) : (
      part
    ),
  );
}

/** Shared layout for the privacy and terms pages. Server component: no client JavaScript. */
export default function Legal({ locale, doc }: { locale: Locale; doc: Doc }) {
  const copy = getCopy(locale);
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="t-title text-3xl font-black sm:text-4xl">{doc.title}</h1>
      <p role="note" className="glass mt-6 rounded-2xl p-4 text-sm leading-relaxed">
        <strong className="font-black">{copy.legal.draftTitle}: </strong>
        {copy.legal.draft}
      </p>
      {doc.sections.map((s) => (
        <section key={s.h} className="mt-10">
          <h2 className="t-title text-xl font-black">{s.h}</h2>
          <ul className="mt-3 grid list-disc gap-2 ps-5 leading-relaxed text-muted marker:text-brand-ink">
            {s.p.map((line) => (
              <li key={line}><Marked text={line} /></li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
