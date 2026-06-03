"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { captureCheckoutSuccess } from "@/lib/posthog";
import { supabase } from "@/lib/supabaseClient";
import { fetchUserPremium } from "@/lib/userProfile";

export default function CheckoutSuccessPage() {
  const [premiumActive, setPremiumActive] = useState<boolean | null>(null);

  useEffect(() => {
    captureCheckoutSuccess();

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (!uid) {
        if (mounted) setPremiumActive(false);
        return;
      }
      void fetchUserPremium(uid).then((p) => {
        if (mounted) setPremiumActive(p);
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-4 bg-[#0b0f14] text-white">
      <h1 className="text-xl font-semibold text-center">お支払いありがとうございます</h1>
      {premiumActive === true ? (
        <p className="text-emerald-200/90 text-sm text-center max-w-md leading-relaxed">
          Premium が有効になりました。ホームで全テーマや自然音ミックスをお試しください。
        </p>
      ) : (
        <p className="text-white/70 text-sm text-center max-w-md leading-relaxed">
          決済の反映は Stripe の通知を受けてサーバー側で処理されます。数秒〜数分でプレミアムが有効になる場合があります。
          <br />
          反映後はホームを開き直すか、再読み込みすると状態が更新されます。
        </p>
      )}
      {premiumActive === false ? (
        <p className="text-white/50 text-xs text-center max-w-md leading-relaxed">
          反映されない場合は、ページを再読み込みするか、しばらく待ってからホームを開き直してください。
        </p>
      ) : null}
      <Link
        href="/"
        className="mt-2 px-5 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-medium hover:bg-white/90"
      >
        アプリに戻る
      </Link>
    </main>
  );
}
