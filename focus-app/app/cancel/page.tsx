"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function CheckoutCancelPage() {
  useEffect(() => {
    try {
      localStorage.removeItem("isPremiumUser");
    } catch {
      // ローカルストレージが利用できない環境では無視（仮実装）
    }
  }, []);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-4 bg-[#0b0f14] text-white">
      <h1 className="text-xl font-semibold text-center">決済がキャンセルされました</h1>
      <p className="text-white/70 text-sm text-center max-w-md leading-relaxed">
        プレミアム登録は完了していません。いつでも再度お試しください。
      </p>
      <Link
        href="/"
        className="mt-2 px-5 py-2.5 rounded-xl bg-white/15 border border-white/25 text-sm font-medium text-white hover:bg-white/20"
      >
        アプリに戻る
      </Link>
    </main>
  );
}
