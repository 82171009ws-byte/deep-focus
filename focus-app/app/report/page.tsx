"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PremiumUpsellModal } from "@/components/PremiumUpsellModal";
import { usePremiumFeatureGate } from "@/hooks/usePremiumFeatureGate";
import { createPremiumCheckoutSession } from "@/lib/premiumCheckoutClient";
import { supabase } from "@/lib/supabaseClient";
import { captureReportView } from "@/lib/posthog";
import { fetchUserPremium } from "@/lib/userProfile";

const STREAK_KEY = "focus-streak";
const GOAL_KEY = "focus-daily-goal";

function statsKey(d: string) {
  return `focus-stats-${d}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function last7DateKeys(): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return remain > 0 ? `${hours}時間${remain}分` : `${hours}時間`;
}

type StreakState = {
  currentStreak: number;
  lastAchievedDate: string | null;
  achievedToday: boolean;
};

function readDayStats(day: string): { completedPomos: number; focusSeconds: number } {
  try {
    const raw = localStorage.getItem(statsKey(day));
    if (!raw) return { completedPomos: 0, focusSeconds: 0 };
    const p = JSON.parse(raw) as { focusSeconds?: unknown; completedPomos?: unknown };
    return {
      completedPomos: Number(p?.completedPomos) || 0,
      focusSeconds: Number(p?.focusSeconds) || 0,
    };
  } catch {
    return { completedPomos: 0, focusSeconds: 0 };
  }
}

export default function ReportPage() {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [isPremiumUpsellOpen, setIsPremiumUpsellOpen] = useState(false);
  const [premiumCheckoutLoading, setPremiumCheckoutLoading] = useState(false);
  const [premiumCheckoutError, setPremiumCheckoutError] = useState<string | null>(null);

  const [completedPomos, setCompletedPomos] = useState(0);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [streak, setStreak] = useState<StreakState>({
    currentStreak: 0,
    lastAchievedDate: null,
    achievedToday: false,
  });
  const [dailyGoal, setDailyGoal] = useState(4);

  useEffect(() => {
    captureReportView();
  }, []);

  useEffect(() => {
    let m = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!m) return;
      const uid = data.session?.user?.id ?? null;
      setAuthUserId(uid);
      if (uid) {
        void fetchUserPremium(uid).then((p) => {
          if (m) setIsPremiumUser(p);
        });
      } else {
        setIsPremiumUser(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setAuthUserId(uid);
      if (uid) void fetchUserPremium(uid).then((p) => setIsPremiumUser(p));
      else setIsPremiumUser(false);
    });
    return () => {
      m = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const d = todayKey();
    try {
      const rawStats = localStorage.getItem(statsKey(d));
      if (rawStats) {
        const p = JSON.parse(rawStats) as { focusSeconds?: unknown; completedPomos?: unknown };
        setFocusSeconds(Number(p?.focusSeconds) || 0);
        setCompletedPomos(Number(p?.completedPomos) || 0);
      } else {
        setFocusSeconds(0);
        setCompletedPomos(0);
      }
    } catch {
      setFocusSeconds(0);
      setCompletedPomos(0);
    }

    try {
      const rawStreak = localStorage.getItem(STREAK_KEY);
      if (rawStreak) {
        const p = JSON.parse(rawStreak) as Partial<StreakState>;
        setStreak({
          currentStreak: Number(p?.currentStreak) || 0,
          lastAchievedDate: typeof p?.lastAchievedDate === "string" ? p.lastAchievedDate : null,
          achievedToday: typeof p?.achievedToday === "boolean" ? p.achievedToday : false,
        });
      }
    } catch {
      setStreak({ currentStreak: 0, lastAchievedDate: null, achievedToday: false });
    }

    try {
      const g = Number(localStorage.getItem(GOAL_KEY));
      setDailyGoal(Number.isFinite(g) && g > 0 ? g : 4);
    } catch {
      setDailyGoal(4);
    }
  }, []);

  useEffect(() => {
    if (!isPremiumUpsellOpen) {
      setPremiumCheckoutError(null);
      setPremiumCheckoutLoading(false);
    }
  }, [isPremiumUpsellOpen]);

  const openPremiumUpsell = useCallback(() => setIsPremiumUpsellOpen(true), []);

  const requestPremiumFeature = usePremiumFeatureGate({
    authUserId,
    isPremiumUser,
    onNeedPremium: openPremiumUpsell,
  });

  const startPremiumCheckout = useCallback(async () => {
    if (!authUserId) {
      router.push("/login");
      return;
    }
    setPremiumCheckoutError(null);
    setPremiumCheckoutLoading(true);
    try {
      const result = await createPremiumCheckoutSession();
      if (!result.ok) {
        if ("needsLogin" in result) {
          router.push("/login");
        } else {
          setPremiumCheckoutError(result.error);
        }
        setPremiumCheckoutLoading(false);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setPremiumCheckoutError("通信に失敗しました");
      setPremiumCheckoutLoading(false);
    }
  }, [authUserId, router]);

  const reportUnlocked = Boolean(authUserId && isPremiumUser);

  const weekKeys = useMemo(() => last7DateKeys(), []);
  const weekSeries = useMemo(
    () => weekKeys.map((k) => ({ day: k.slice(5), ...readDayStats(k) })),
    [weekKeys]
  );
  const weekMaxPomo = useMemo(
    () => Math.max(1, ...weekSeries.map((x) => x.completedPomos)),
    [weekSeries]
  );

  return (
    <main className="min-h-dvh bg-[#0b0f14] text-white px-4 py-10 pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md space-y-8">
        <div>
          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white/90 underline decoration-white/30 underline-offset-4"
          >
            ← ホームに戻る
          </Link>
          <h1 className="mt-4 text-xl font-semibold">レポート</h1>
          <p className="mt-2 text-sm text-white/55">今日（{todayKey()}）の記録です。</p>
        </div>

        <dl className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm">
          <div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/60">完了ポモ</dt>
              <dd className="font-medium tabular-nums text-white/90">
                {completedPomos} / {dailyGoal}
              </dd>
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuenow={Math.min(completedPomos, dailyGoal)}
              aria-valuemin={0}
              aria-valuemax={dailyGoal}
            >
              <div
                className="h-full rounded-full bg-white/45 transition-[width]"
                style={{ width: `${Math.min(100, dailyGoal > 0 ? (completedPomos / dailyGoal) * 100 : 0)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-white/40">
              {completedPomos >= dailyGoal
                ? "今日の目標を達成しています"
                : `目標まであと ${Math.max(0, dailyGoal - completedPomos)} ポモ`}
            </p>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/60">集中時間（記録分）</dt>
            <dd className="font-medium tabular-nums text-white/90">{formatDuration(focusSeconds)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/60">連続日数</dt>
            <dd className="font-medium tabular-nums text-white/90">{streak.currentStreak}日</dd>
          </div>
          {streak.achievedToday && (
            <p className="pt-1 text-xs text-emerald-200/90">今日の連続達成を記録済みです。</p>
          )}
        </dl>

        {/* 詳細レポート（Premium） */}
        <section className="relative">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/45">詳細レポート</h2>
          <div
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] ${
              !reportUnlocked ? "shadow-inner" : ""
            }`}
          >
            {!reportUnlocked ? (
              <button
                type="button"
                className="absolute inset-0 z-10 rounded-2xl cursor-pointer"
                onClick={() => requestPremiumFeature(() => {})}
                aria-label="Premiumで詳細レポートを解放"
              />
            ) : null}

            <div
              className={`space-y-6 p-5 ${!reportUnlocked ? "pointer-events-none opacity-[0.72] saturate-[0.88]" : ""}`}
            >
              <div>
                <div className="mb-2">
                  <span className="text-sm font-medium text-white/85">週次推移</span>
                </div>
                <div className="flex h-[100px] items-end gap-1.5">
                  {weekSeries.map((row) => {
                    const barPx = Math.max(6, Math.round((row.completedPomos / weekMaxPomo) * 88));
                    return (
                      <div key={row.day} className="flex flex-1 flex-col items-center justify-end gap-1">
                        <div
                          className="w-full max-w-[28px] rounded-t bg-white/35"
                          style={{ height: `${barPx}px` }}
                          aria-hidden
                        />
                        <span className="text-[9px] tabular-nums text-white/40">{row.day}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-white/45">過去7日の完了ポモ数の推移です。</p>
              </div>

              <div className="border-t border-white/10 pt-5">
                <div className="mb-2">
                  <span className="text-sm font-medium text-white/85">詳細分析</span>
                </div>
                <ul className="space-y-2 text-[13px] leading-relaxed text-white/70">
                  <li>• 直近7日の合計集中: {formatDuration(weekSeries.reduce((a, x) => a + x.focusSeconds, 0))}</li>
                  <li>• 直近7日の完了ポモ合計: {weekSeries.reduce((a, x) => a + x.completedPomos, 0)}</li>
                  <li>• 1日あたり平均（ポモ）: {(weekSeries.reduce((a, x) => a + x.completedPomos, 0) / 7).toFixed(1)}</li>
                </ul>
              </div>

              <div className="border-t border-white/10 pt-5">
                <div className="mb-2">
                  <span className="text-sm font-medium text-white/85">タスク別の深い表示</span>
                </div>
                <p className="text-[13px] leading-relaxed text-white/55">
                  タスクごとの集中配分や優先度の分析は、今後の記録連携でさらに充実させる予定です。
                </p>
              </div>
            </div>

            {!reportUnlocked ? (
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-center justify-center rounded-lg border border-amber-400/20 bg-[#0b0f14]/80 py-2 backdrop-blur-[2px]">
                <span className="text-[11px] font-medium text-amber-100/90">Premiumで解放</span>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <PremiumUpsellModal
        open={isPremiumUpsellOpen}
        onClose={() => setIsPremiumUpsellOpen(false)}
        onStartPremium={() => void startPremiumCheckout()}
        checkoutLoading={premiumCheckoutLoading}
        checkoutError={premiumCheckoutError}
      />
    </main>
  );
}
