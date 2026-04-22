import Link from "next/link";
import { LP_PREMIUM } from "../copy";

export function PremiumSection() {
  return (
    <section className="border-y border-white/10 bg-white/[0.02] px-4 py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-xl font-semibold text-white md:text-2xl">
          Premium
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-white/60">
          有料プランで追加の集中体験と詳細機能が利用できます。
        </p>
        <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-emerald-500/30 bg-[#0b0f14] p-6 md:p-8">
          <p className="text-center text-sm font-medium text-emerald-400/95">
            {LP_PREMIUM.heading}
          </p>
          <p className="mt-4 text-center text-2xl font-semibold text-white md:text-3xl">
            {LP_PREMIUM.priceDisplay}
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            {LP_PREMIUM.benefits.map((item) => (
              <li key={item} className="flex gap-3">
                <span
                  className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-emerald-400"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-xs text-white/50">
            {LP_PREMIUM.note}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/premium-about"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/25 bg-white/5 px-5 text-sm font-medium text-white hover:bg-white/10"
            >
              Premium の詳細を見る
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-medium text-[#0b0f14] hover:bg-white/90"
            >
              アプリを開く
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
