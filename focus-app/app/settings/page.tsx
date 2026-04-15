"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { clearPremiumLocalStorage, fetchUserPremium } from "@/lib/userProfile";

const rowClass =
  "flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-left text-sm text-white/90 transition hover:bg-white/[0.09]";

export default function SettingsPage() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    let m = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!m) return;
      const uid = data.session?.user?.id ?? null;
      setAuthUserId(uid);
      if (uid) {
        void fetchUserPremium(uid).then((p) => {
          if (m) setIsPremium(p);
        });
      } else {
        setIsPremium(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setAuthUserId(uid);
      if (uid) void fetchUserPremium(uid).then((p) => setIsPremium(p));
      else setIsPremium(false);
    });
    return () => {
      m = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const openStripeCustomerPortal = useCallback(async () => {
    setPortalError(null);
    setPortalLoading(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setPortalError(data.error ?? "プラン管理を開けませんでした");
        setPortalLoading(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setPortalError("通信に失敗しました");
      setPortalLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setLogoutLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[auth] signOut:", error.message);
        setLogoutLoading(false);
        return;
      }
      clearPremiumLocalStorage();
      window.location.href = "/";
    } catch (e) {
      console.error("[auth] signOut:", e);
      setLogoutLoading(false);
    }
  }, []);

  return (
    <main className="min-h-dvh bg-[#0b0f14] text-white px-4 py-8 pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="text-sm text-white/50 hover:text-white/85 underline decoration-white/25 underline-offset-4"
        >
          ← ホーム
        </Link>
        <h1 className="mt-6 text-xl font-semibold tracking-tight">設定</h1>
        <p className="mt-3 text-xs text-white/45 leading-relaxed">
          見た目・サウンド・プランはここから。タイマーはホームでシンプルに始められます。
        </p>

        <nav className="mt-10 flex flex-col gap-3" aria-label="設定メニュー">
          <Link href="/?settings=theme" className={rowClass}>
            <span>テーマ</span>
            <span className="text-white/35">›</span>
          </Link>
          <Link href="/?settings=noise" className={rowClass}>
            <span>ホワイトノイズ</span>
            <span className="text-white/35">›</span>
          </Link>
          <p className="text-[11px] text-white/35 px-1 -mt-1 leading-relaxed">
            全画面はホーム右上の設定メニューから切り替えられます。
          </p>
          <Link href="/?settings=premium" className={rowClass}>
            <span>プレミアムについて</span>
            <span className="text-white/35">›</span>
          </Link>
          {authUserId && isPremium && (
            <button
              type="button"
              disabled={portalLoading}
              onClick={() => void openStripeCustomerPortal()}
              className={`${rowClass} disabled:opacity-50`}
            >
              <span>{portalLoading ? "開いています…" : "プラン管理"}</span>
              <span className="text-white/35">›</span>
            </button>
          )}
          {portalError && (
            <p className="text-xs text-red-300/95 px-1" role="alert">
              {portalError}
            </p>
          )}
        </nav>

        <div className="mt-14 border-t border-white/10 pt-8 space-y-3">
          {authUserId ? (
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={logoutLoading}
              className="w-full rounded-xl border border-white/15 py-3 text-sm text-white/75 hover:bg-white/[0.06] disabled:opacity-50"
            >
              {logoutLoading ? "ログアウト中…" : "ログアウト"}
            </button>
          ) : (
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-xl bg-white/15 py-3 text-sm font-medium text-white hover:bg-white/20"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
