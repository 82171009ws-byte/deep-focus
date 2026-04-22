import Link from "next/link";
import { LP_HERO } from "../copy";

export function HeroSection() {
  return (
    <section className="relative border-b border-white/10 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400/90">
          {LP_HERO.productName}
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
          {LP_HERO.tagline}
        </h1>
        <p className="mt-6 text-base leading-relaxed text-white/75 md:text-lg">
          {LP_HERO.subcopy}
        </p>
        <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-medium text-[#0b0f14] transition hover:bg-white/90"
          >
            {LP_HERO.ctaPrimary}
          </Link>
          <Link
            href="/premium-about"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/25 bg-white/5 px-6 text-sm font-medium text-white transition hover:bg-white/10"
          >
            {LP_HERO.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
