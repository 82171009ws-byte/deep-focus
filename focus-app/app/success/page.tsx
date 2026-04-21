"use client";

import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-4 bg-[#0b0f14] text-white">
      <h1 className="text-xl font-semibold text-center">お支払いありがとうございます</h1>
      <p className="text-white/70 text-sm text-center max-w-md leading-relaxed">
        決済の反映は Stripe の通知を受けてサーバー側で処理されます。数秒〜数分でプレミアムが有効になる場合があります。
        <br />
        反映後はホームを開き直すか、再読み込みすると状態が更新されます。
      </p>
      <Link
        href="/"
        className="mt-2 px-5 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-medium hover:bg-white/90"
      >
        アプリに戻る
      </Link>
    </main>
  );
}
