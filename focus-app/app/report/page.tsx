"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STREAK_KEY = "focus-streak";
const GOAL_KEY = "focus-daily-goal";

function statsKey(d: string) {
  return `focus-stats-${d}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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

export default function ReportPage() {
  const [completedPomos, setCompletedPomos] = useState(0);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [streak, setStreak] = useState<StreakState>({
    currentStreak: 0,
    lastAchievedDate: null,
    achievedToday: false,
  });
  const [dailyGoal, setDailyGoal] = useState(4);

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

  return (
    <main className="min-h-dvh bg-[#0b0f14] text-white px-4 py-10">
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

        <dl className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-white/60">完了ポモ</dt>
            <dd className="font-medium tabular-nums text-white/90">
              {completedPomos} / 目標 {dailyGoal}
            </dd>
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
            <p className="text-xs text-emerald-200/90 pt-1">今日の連続達成を記録済みです。</p>
          )}
        </dl>
      </div>
    </main>
  );
}
