"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPremiumCheckoutSession } from "@/lib/premiumCheckoutClient";
import { capturePremiumClick } from "@/lib/posthog";
import { supabase } from "@/lib/supabaseClient";
import { fetchUserPremium } from "@/lib/userProfile";

export function PremiumAboutCheckout() {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const uid = data.session?.user?.id ?? null;
      setAuthUserId(uid);
      if (uid) {
        void fetchUserPremium(uid).then((p) => {
          if (mounted) {
            setIsPremium(p);
            setLoading(false);
          }
        });
      } else {
        setIsPremium(false);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setAuthUserId(uid);
      if (uid) void fetchUserPremium(uid).then((p) => setIsPremium(p));
      else setIsPremium(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleStartPremium = useCallback(async () => {
    if (!authUserId) {
      router.push("/login");
      return;
    }
    setCheckoutError(null);
    setCheckoutLoading(true);
    capturePremiumClick();
    try {
      const result = await createPremiumCheckoutSession();
      if (!result.ok) {
        if ("needsLogin" in result) {
          router.push("/login");
        } else {
          setCheckoutError(result.error);
        }
        setCheckoutLoading(false);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setCheckoutError("通信に失敗しました");
      setCheckoutLoading(false);
    }
  }, [authUserId, router]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-white/50">
        読み込み中…
      </div>
    );
  }

  if (isPremium) {
    return (
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5 text-center">
        <p className="text-sm font-medium text-emerald-200/95">Premium利用中</p>
        <p className="mt-2 text-xs text-white/55 leading-relaxed">
          全テーマ・自然音ミックス・詳細レポートなど、Premium機能をご利用いただけます。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={checkoutLoading}
        onClick={() => void handleStartPremium()}
        className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-white/90 disabled:pointer-events-none disabled:opacity-60"
      >
        {checkoutLoading ? "処理中…" : "Premiumを始める（月額490円）"}
      </button>
      {checkoutError ? (
        <p className="text-center text-xs text-red-300/95" role="alert">
          {checkoutError}
        </p>
      ) : null}
    </div>
  );
}
