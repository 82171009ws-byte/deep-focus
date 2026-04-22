import type { Metadata } from "next";
import Link from "next/link";
import { FeaturesSection } from "./_components/FeaturesSection";
import { FaqSection } from "./_components/FaqSection";
import { HeroSection } from "./_components/HeroSection";
import { LpFooter } from "./_components/LpFooter";
import { PremiumSection } from "./_components/PremiumSection";
import { ScreenshotsSection } from "./_components/ScreenshotsSection";

export const metadata: Metadata = {
  title: "Deep Focus — 集中のためのシンプルなタイマーアプリ",
  description:
    "タイマー、ホワイトノイズ、テーマ切り替えで作業に入りやすい環境を整える Web アプリ Deep Focus のご紹介です。",
  openGraph: {
    title: "Deep Focus — 集中のためのシンプルなタイマーアプリ",
    description:
      "タイマー、ホワイトノイズ、テーマ切り替えで作業に入りやすい環境を整える Web アプリです。",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#0b0f14] text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0f14]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/lp" className="text-sm font-semibold tracking-tight text-white">
            Deep Focus
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-3 text-sm">
            <Link
              href="/"
              className="rounded-md px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white"
            >
              アプリ
            </Link>
            <Link
              href="/premium-about"
              className="rounded-md px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white"
            >
              Premium
            </Link>
          </nav>
        </div>
      </header>

      <HeroSection />
      <FeaturesSection />
      <PremiumSection />
      <ScreenshotsSection />
      <FaqSection />
      <LpFooter />
    </div>
  );
}
