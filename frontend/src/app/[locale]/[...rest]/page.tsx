import { notFound } from "next/navigation";

// Any unknown path under a locale renders [locale]/not-found.tsx inside the locale layout (header,
// footer, fonts) with a real 404 status, instead of Next's unstyled global 404.
export default function CatchAll() {
  notFound();
}
