import Link from "next/link";

import CupLogo from "@/components/CupLogo";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-32 text-center">
      <CupLogo className="h-16 w-16 animate-float" />
      <h1 className="mt-6 text-5xl font-black">404</h1>
      <p className="mt-3 text-muted">این فنجان خالی است / This cup is empty.</p>
      <Link
        href="/fa"
        className="mt-8 inline-flex h-12 items-center rounded-full bg-gradient-to-r from-brand to-brand2 px-7 font-bold text-white"
      >
        بازگشت / Back
      </Link>
    </div>
  );
}
