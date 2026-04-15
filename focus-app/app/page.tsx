"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchUserNoisePrefs, fetchUserPremium, upsertUserNoisePrefs } from "@/lib/userProfile";
import { loadTasksFromLocalStorage, persistTasksToLocalStorage, type Task } from "@/lib/tasksLocal";
import { persistSelectedTaskIdToSupabase, updateTaskInSupabase } from "@/lib/tasksSupabase";
import {
  hydrateLocalTasks,
  hydrateRemoteTasks,
  migrateLocalTasksIfNeeded,
} from "@/lib/taskSessionSync";
import { AppMenuDrawer } from "@/components/AppMenuDrawer";
import { HomeSettingsFromQuery, type HomeSettingsHandlers } from "@/components/HomeSettingsFromQuery";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type TimerStatus = "idle" | "running" | "paused";

type PomodoroMode = "work" | "shortBreak" | "longBreak";

type FocusPresetKey = "quick" | "standard" | "deep";

type BackgroundThemeKey =
  | "sea"
  | "desert"
  | "snow"
  | "night"
  | "mint"
  | "peach"
  | "lavender"
  | "sky";

const SESSIONS_BEFORE_LONG = 4;

interface FocusPresetConfig {
  label: string;
  focusSeconds: number;
  shortBreakSeconds: number;
  longBreakSeconds: number;
}

const FOCUS_PRESETS: Record<FocusPresetKey, FocusPresetConfig> = {
  quick: {
    label: "クイック集中",
    focusSeconds: 10 * 60,
    shortBreakSeconds: 3 * 60,
    longBreakSeconds: 10 * 60,
  },
  standard: {
    label: "スタンダード",
    focusSeconds: 25 * 60,
    shortBreakSeconds: 5 * 60,
    longBreakSeconds: 15 * 60,
  },
  deep: {
    label: "ディープ集中",
    focusSeconds: 60 * 60,
    shortBreakSeconds: 10 * 60,
    longBreakSeconds: 20 * 60,
  },
};

const FOCUS_PRESET_KEYS: FocusPresetKey[] = ["quick", "standard", "deep"];

const DEFAULT_FOCUS_PRESET: FocusPresetKey = "standard";

function getPresetConfig(preset: FocusPresetKey): FocusPresetConfig {
  return FOCUS_PRESETS[preset];
}

function getModeSeconds(mode: PomodoroMode, preset: FocusPresetKey): number {
  const config = getPresetConfig(preset);
  switch (mode) {
    case "work":
      return config.focusSeconds;
    case "shortBreak":
      return config.shortBreakSeconds;
    case "longBreak":
      return config.longBreakSeconds;
  }
}

function getModeLabel(mode: PomodoroMode): string {
  switch (mode) {
    case "work":
      return "作業";
    case "shortBreak":
      return "短休憩";
    case "longBreak":
      return "長休憩";
  }
}

// ホワイトノイズ（配列順 = 同一カテゴリ内の表示順）。ding.mp3 は完了通知専用のため含めない。
type SoundOption = {
  id: string;
  label: string;
  file: string;
  isPremium: boolean;
  hint?: string;
  /** プレミアムのみ: モーダルでのカテゴリ（環境音 / 集中トーン） */
  premiumGroup?: "ambient" | "focus";
};

const SOUND_OPTIONS: SoundOption[] = [
  { id: "none", label: "なし", file: "", isPremium: false },
  {
    id: "tukutuku",
    label: "ツクツクボウシ",
    file: "/sounds/tukutuku.mp3",
    isPremium: false,
    hint: "自然音",
  },
  {
    id: "seseragi",
    label: "川",
    file: "/sounds/seseragi.mp3",
    isPremium: false,
    hint: "落ち着きたい時",
  },
  {
    id: "takibi",
    label: "焚き火",
    file: "/sounds/takibi.mp3",
    isPremium: false,
    hint: "夜向け",
  },
  // プレミアム・環境音
  {
    id: "rain",
    label: "雨",
    file: "/sounds/rain.mp3",
    isPremium: true,
    premiumGroup: "ambient",
    hint: "雨の日気分",
  },
  {
    id: "cafe",
    label: "カフェ",
    file: "/sounds/cafe.mp3",
    isPremium: true,
    premiumGroup: "ambient",
    hint: "カフェ気分",
  },
  {
    id: "typing",
    label: "タイピング",
    file: "/sounds/typing.mp3",
    isPremium: true,
    premiumGroup: "ambient",
    hint: "作業音",
  },
  {
    id: "library",
    label: "図書館",
    file: "/sounds/library.mp3",
    isPremium: true,
    premiumGroup: "ambient",
    hint: "静かな空間",
  },
  {
    id: "ocean",
    label: "海",
    file: "/sounds/ocean.mp3",
    isPremium: true,
    premiumGroup: "ambient",
    hint: "リラックス",
  },
  // プレミアム・集中トーン
  {
    id: "tick",
    label: "チクタク",
    file: "/sounds/tick.mp3",
    isPremium: true,
    premiumGroup: "focus",
    hint: "集中のリズム",
  },
  {
    id: "countdown",
    label: "秒読み",
    file: "/sounds/countdown.mp3",
    isPremium: true,
    premiumGroup: "focus",
    hint: "追い込み",
  },
  {
    id: "focus528hz",
    label: "528Hzトーン",
    file: "/sounds/focus-528hz.mp3",
    isPremium: true,
    premiumGroup: "focus",
    hint: "静かな持続音",
  },
];

function normalizeNoiseId(rawId: string): string {
  const id = rawId === "count" ? "countdown" : rawId;
  const opt = SOUND_OPTIONS.find((o) => o.id === id);
  return opt ? id : "none";
}

interface BackgroundTheme {
  key: BackgroundThemeKey;
  type: "immersive" | "pastel";
  label: string;
  backgroundImage: string;
  overlay: string;
}

const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    key: "sea",
    type: "immersive",
    label: "海",
    backgroundImage:
      "radial-gradient(circle at 30% 10%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 35%), linear-gradient(160deg, #031b34 0%, #046a84 45%, #0a2f5a 100%)",
    overlay: "rgba(0,0,0,0.28)",
  },
  {
    key: "desert",
    type: "immersive",
    label: "砂漠",
    backgroundImage:
      "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 40%), linear-gradient(160deg, #2a1406 0%, #b36b2a 45%, #f2c27c 100%)",
    overlay: "rgba(0,0,0,0.32)",
  },
  {
    key: "snow",
    type: "immersive",
    label: "雪山",
    backgroundImage:
      "radial-gradient(circle at 30% 10%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 45%), linear-gradient(160deg, #0b1b2a 0%, #3b6a8d 45%, #d7e8f4 100%)",
    overlay: "rgba(0,0,0,0.28)",
  },
  {
    key: "night",
    type: "immersive",
    label: "夜空",
    backgroundImage:
      "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%), radial-gradient(circle at 20% 60%, rgba(144,97,255,0.20) 0%, rgba(144,97,255,0) 40%), linear-gradient(160deg, #05040f 0%, #0b0f2a 55%, #02030a 100%)",
    overlay: "rgba(0,0,0,0.35)",
  },
  {
    key: "mint",
    type: "pastel",
    label: "ミント",
    backgroundImage:
      "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 45%), linear-gradient(155deg, #b7f4e3 0%, #7fe8d8 45%, #6bd7ff 100%)",
    overlay: "rgba(0,0,0,0.18)",
  },
  {
    key: "peach",
    type: "pastel",
    label: "ピーチ",
    backgroundImage:
      "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 45%), linear-gradient(155deg, #ffd1b8 0%, #ffb1c8 45%, #ffc6a5 100%)",
    overlay: "rgba(0,0,0,0.20)",
  },
  {
    key: "lavender",
    type: "pastel",
    label: "ラベンダー",
    backgroundImage:
      "radial-gradient(circle at 30% 12%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 45%), linear-gradient(155deg, #e6d7ff 0%, #cbb8ff 45%, #a9b8ff 100%)",
    overlay: "rgba(0,0,0,0.22)",
  },
  {
    key: "sky",
    type: "pastel",
    label: "スカイ",
    backgroundImage:
      "radial-gradient(circle at 30% 12%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 45%), linear-gradient(155deg, #b9e7ff 0%, #a9c7ff 45%, #d7f3ff 100%)",
    overlay: "rgba(0,0,0,0.16)",
  },
];

const DEFAULT_BACKGROUND_THEME: BackgroundThemeKey = "night";

function getBackgroundTheme(themeKey: BackgroundThemeKey): BackgroundTheme {
  return (
    BACKGROUND_THEMES.find((t) => t.key === themeKey) ??
    BACKGROUND_THEMES.find((t) => t.key === DEFAULT_BACKGROUND_THEME) ??
    BACKGROUND_THEMES[0]
  );
}

interface NoiseTheme {
  backgroundImage: string;
  overlay: string;
}

function getNoiseTheme(baseTheme: BackgroundThemeKey): NoiseTheme {
  // 音と背景を完全に切り離す: 背景はユーザー選択テーマのみ
  const base = getBackgroundTheme(baseTheme);
  return { backgroundImage: base.backgroundImage, overlay: base.overlay };
}

interface DailyStats {
  focusSeconds: number;
  completedPomos: number;
}

interface StreakState {
  currentStreak: number;
  lastAchievedDate: string | null;
  achievedToday: boolean;
}

const STORAGE_KEYS = {
  stats: (d: string) => `focus-stats-${d}`,
  selectedTask: "focus-selected-task",
  noise: "focus-noise",
  focusPreset: "focus-preset",
  backgroundTheme: "focus-background-theme",
  streak: "focus-streak",
} as const;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDateKey(dateKey: string, dayOffset: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function loadStats(): DailyStats {
  if (typeof window === "undefined") return { focusSeconds: 0, completedPomos: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.stats(getTodayKey()));
    if (!raw) return { focusSeconds: 0, completedPomos: 0 };
    const p = JSON.parse(raw);
    return {
      focusSeconds: Number(p?.focusSeconds) || 0,
      completedPomos: Number(p?.completedPomos) || 0,
    };
  } catch {
    return { focusSeconds: 0, completedPomos: 0 };
  }
}

function loadStreak(): StreakState {
  if (typeof window === "undefined") {
    return { currentStreak: 0, lastAchievedDate: null, achievedToday: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.streak);
    if (!raw) {
      return { currentStreak: 0, lastAchievedDate: null, achievedToday: false };
    }
    const p = JSON.parse(raw) as Partial<StreakState>;
    const currentStreak = Number(p?.currentStreak) || 0;
    const lastAchievedDate = typeof p?.lastAchievedDate === "string" ? p.lastAchievedDate : null;
    const achievedToday = typeof p?.achievedToday === "boolean" ? p.achievedToday : false;
    const todayKey = getTodayKey();
    const yesterdayKey = shiftDateKey(todayKey, -1);

    if (!lastAchievedDate) {
      return { currentStreak: 0, lastAchievedDate: null, achievedToday: false };
    }

    if (lastAchievedDate === todayKey) {
      return { currentStreak, lastAchievedDate, achievedToday: true };
    }

    if (lastAchievedDate === yesterdayKey) {
      return { currentStreak, lastAchievedDate, achievedToday: false };
    }

    return { currentStreak: 0, lastAchievedDate, achievedToday: false };
  } catch {
    return { currentStreak: 0, lastAchievedDate: null, achievedToday: false };
  }
}

function loadSelectedTaskId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.selectedTask);
}

function loadNoise(): {
  selectedNoise: string;
  selectedNoise2: string;
  noiseVolume: number;
} {
  if (typeof window === "undefined") return { selectedNoise: "none", selectedNoise2: "none", noiseVolume: 70 };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.noise);
    if (!raw) return { selectedNoise: "none", selectedNoise2: "none", noiseVolume: 70 };
    const p = JSON.parse(raw) as { selectedNoise?: string; selectedNoise2?: string; noiseVolume?: number };
    const rawValue = typeof p?.selectedNoise === "string" ? p.selectedNoise : "none";
    const rawValue2 = typeof p?.selectedNoise2 === "string" ? p.selectedNoise2 : "none";
    // 旧バージョンで保存していた「表示名」→ 内部キーへのマッピング
    const legacyMap: Record<string, string> = {
      なし: "none",
      チクタク: "tick",
      秒読み: "countdown",
      count: "countdown", // 旧 id（秒読み）
      こおろぎ: "tukutuku",
      ツクツクボウシ: "tukutuku",
      雨: "rain",
      川: "seseragi",
      焚き火: "takibi",
      カフェ: "cafe",
    };
    const candidate = normalizeNoiseId(legacyMap[rawValue] ?? rawValue);
    const candidate2 = normalizeNoiseId(legacyMap[rawValue2] ?? rawValue2);
    const vol = typeof p?.noiseVolume === "number" && p.noiseVolume >= 0 && p.noiseVolume <= 100 ? p.noiseVolume : 70;
    return { selectedNoise: candidate, selectedNoise2: candidate2 === candidate ? "none" : candidate2, noiseVolume: vol };
  } catch {
    return { selectedNoise: "none", selectedNoise2: "none", noiseVolume: 70 };
  }
}

function loadFocusPreset(): FocusPresetKey {
  if (typeof window === "undefined") return DEFAULT_FOCUS_PRESET;
  const raw = localStorage.getItem(STORAGE_KEYS.focusPreset);
  if (raw === "quick" || raw === "standard" || raw === "deep") return raw;
  return DEFAULT_FOCUS_PRESET;
}

function loadBackgroundTheme(): BackgroundThemeKey {
  if (typeof window === "undefined") return DEFAULT_BACKGROUND_THEME;
  const raw = localStorage.getItem(STORAGE_KEYS.backgroundTheme);
  if (
    raw === "sea" ||
    raw === "desert" ||
    raw === "snow" ||
    raw === "night" ||
    raw === "mint" ||
    raw === "peach" ||
    raw === "lavender" ||
    raw === "sky"
  )
    return raw;
  return DEFAULT_BACKGROUND_THEME;
}

/** 12時起点・時計回りの円周進捗（中央はクリア） */
function TimerProgressRing({
  elapsedRatio,
  className,
  strokeWidth = 3.25,
}: {
  elapsedRatio: number;
  className?: string;
  strokeWidth?: number;
}) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, elapsedRatio));
  const dashOffset = circumference * (1 - p);

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
    >
      <g transform="rotate(-90 50 50)">
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke="rgba(255,255,255,0.52)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </g>
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function Home() {
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");
  const [isNoiseModalOpen, setIsNoiseModalOpen] = useState(false);
  const [isPremiumNoiseUpsellOpen, setIsPremiumNoiseUpsellOpen] = useState(false);
  const [premiumCheckoutLoading, setPremiumCheckoutLoading] = useState(false);
  const [premiumCheckoutError, setPremiumCheckoutError] = useState<string | null>(null);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [isTaskQuickPickerOpen, setIsTaskQuickPickerOpen] = useState(false);
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);
  const [selectedNoise, setSelectedNoise] = useState(() => loadNoise().selectedNoise);
  const [selectedNoise2, setSelectedNoise2] = useState(() => loadNoise().selectedNoise2);
  const [noiseVolume, setNoiseVolume] = useState(() => loadNoise().noiseVolume);
  const [justCompletedWork, setJustCompletedWork] = useState(false);
  const [justCompletedBreak, setJustCompletedBreak] = useState(false);
  const [nextActionHint, setNextActionHint] = useState<string>("");
  const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);
  const [isFullscreenControlsVisible, setIsFullscreenControlsVisible] = useState(false);
  const [focusPreset, setFocusPreset] = useState<FocusPresetKey>(() => loadFocusPreset());
  const [streak, setStreak] = useState<StreakState>(() => loadStreak());
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundThemeKey>(() =>
    loadBackgroundTheme()
  );

  /** ログイン後のリモートタスク取得完了まで true にしない（選択を DB に誤書きしない） */
  const tasksRemoteHydratedRef = useRef(false);
  const prevRemoteTaskUserIdRef = useRef<string | null>(null);
  const [tasksRemoteLoading, setTasksRemoteLoading] = useState(false);

  // Supabase Auth + プレミアム: ログイン中は DB 優先、未ログインは localStorage
  useEffect(() => {
    let mounted = true;

    const syncNoise = (session: { user?: { id?: string } } | null) => {
      if (!mounted) return;
      const uid = session?.user?.id;
      if (uid) {
        void fetchUserNoisePrefs(uid).then((prefs) => {
          if (!mounted) return;
          const s1 = normalizeNoiseId(prefs.selectedNoise);
          const s2 = normalizeNoiseId(prefs.selectedNoise2);
          const vol =
            typeof prefs.noiseVolume === "number" && prefs.noiseVolume >= 0 && prefs.noiseVolume <= 100
              ? prefs.noiseVolume
              : 70;
          setSelectedNoise(s1);
          setSelectedNoise2(s2 === s1 ? "none" : s2);
          setNoiseVolume(vol);
        });
      } else {
        const { selectedNoise: s, selectedNoise2: s2, noiseVolume: v } = loadNoise();
        setSelectedNoise(s);
        setSelectedNoise2(s2);
        setNoiseVolume(v);
      }
    };

    const syncPremium = (session: { user?: { id?: string } } | null) => {
      if (!mounted) return;
      const uid = session?.user?.id;
      if (uid) {
        void fetchUserPremium(uid).then((premium) => {
          if (!mounted) return;
          setIsPremiumUser(premium);
        });
      } else {
        setIsPremiumUser(false);
      }
    };

    const syncTasksSession = async (session: { user?: { id?: string } } | null) => {
      if (!mounted) return;
      const uid = session?.user?.id ?? null;

      if (!uid) {
        prevRemoteTaskUserIdRef.current = null;
        tasksRemoteHydratedRef.current = true;
        setTasksRemoteLoading(false);
        const local = hydrateLocalTasks();
        setTasks(local.tasks);
        setSelectedTaskId(local.selectedTaskId);
        return;
      }

      const isNewRemoteUser = prevRemoteTaskUserIdRef.current !== uid;
      if (isNewRemoteUser) {
        prevRemoteTaskUserIdRef.current = uid;
        setTasksRemoteLoading(true);
        tasksRemoteHydratedRef.current = false;
      }

      const mig = await migrateLocalTasksIfNeeded(session);
      if (!mig.ok) {
        console.error("[tasks] migrateLocalTasksIfNeeded:", mig.error);
        setTasksRemoteLoading(false);
        tasksRemoteHydratedRef.current = true;
        return;
      }

      const remote = await hydrateRemoteTasks(session);
      setTasksRemoteLoading(false);
      tasksRemoteHydratedRef.current = true;

      if (!remote.ok) {
        console.error("[tasks] hydrateRemoteTasks:", remote.error);
        return;
      }

      if (!mounted) return;
      setTasks(remote.tasks);
      setSelectedTaskId(remote.selectedTaskId);
    };

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const session = data.session ?? null;
        setAuthUserId(session?.user?.id ?? null);
        syncPremium(session);
        syncNoise(session);
        void syncTasksSession(session);
      })
      .catch(() => {
        if (!mounted) return;
        setAuthUserId(null);
        setIsPremiumUser(false);
        const { selectedNoise: s, selectedNoise2: s2, noiseVolume: v } = loadNoise();
        setSelectedNoise(s);
        setSelectedNoise2(s2);
        setNoiseVolume(v);
        prevRemoteTaskUserIdRef.current = null;
        tasksRemoteHydratedRef.current = true;
        setTasksRemoteLoading(false);
        const local = hydrateLocalTasks();
        setTasks(local.tasks);
        setSelectedTaskId(local.selectedTaskId);
      });

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const onAuth = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setAuthUserId(session?.user?.id ?? null);
        syncPremium(session);
        syncNoise(session);
        void syncTasksSession(session);
      });
      subscription = onAuth.data.subscription;
    } catch {
      subscription = null;
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const [mode, setMode] = useState<PomodoroMode>("work");
  const [seconds, setSeconds] = useState(() => getModeSeconds("work", loadFocusPreset()));
  const [sessionIndex, setSessionIndex] = useState(1);
  const [tasks, setTasks] = useState<Task[]>(() => loadTasksFromLocalStorage());
  const [stats, setStats] = useState<DailyStats>(() => loadStats());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => loadSelectedTaskId());

  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const settingsQueryHandlersRef = useRef<HomeSettingsHandlers>({
    openTheme: () => {},
    openNoise: () => {},
    openPremium: () => {},
    openBilling: () => {},
  });

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const fullscreenControlsHideTimeoutRef = useRef<number | null>(null);
  const activeDateKeyRef = useRef(getTodayKey());

  const isIdle = timerStatus === "idle";
  const isRunning = timerStatus === "running";
  const isPaused = timerStatus === "paused";
  const running = isRunning;
  /** user_profiles.is_premium のミラー（未ログイン時は常に false とみなす） */
  const [isPremiumUser, setIsPremiumUser] = useState<boolean>(false);
  /** ログインかつ user_profiles.is_premium が true のときのみ有料機能を解放 */
  const isPremiumUnlocked = Boolean(authUserId && isPremiumUser);

  // 無料ユーザーは「1つだけ」選べる。プレミアム音は選べない（ストレージずれにも対応）
  useEffect(() => {
    if (isPremiumUnlocked) return;

    // 2つ目が残っていたら 1つに畳む（1つ目がnoneなら2つ目を昇格）
    if (selectedNoise === "none" && selectedNoise2 !== "none") {
      setSelectedNoise(selectedNoise2);
    }
    if (selectedNoise2 !== "none") setSelectedNoise2("none");

    const primaryOpt = SOUND_OPTIONS.find((o) => o.id === selectedNoise);
    if (primaryOpt?.isPremium) {
      setSelectedNoise("none");
    }
  }, [isPremiumUnlocked, selectedNoise, selectedNoise2]);

  // タイマー刻み（既存ロジックを活かす）
  useEffect(() => {
    if (!running) return;
    const presetConfig = getPresetConfig(focusPreset);
    const t = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          setTimerStatus("idle");
          try {
            audioRefs.current.forEach((a) => {
              try {
                a.pause();
              } catch {}
            });
          } catch {}
          if (mode === "work") {
            // 作業セッション終了時のみ通知音を1回鳴らす（休憩終了では鳴らさない）
            const todayKey = getTodayKey();
            const yesterdayKey = shiftDateKey(todayKey, -1);
            // 参照キーを固定して localStorage との整合性を安定させる
            activeDateKeyRef.current = todayKey;
            playDing();
            const nextBreakIsLong = sessionIndex >= SESSIONS_BEFORE_LONG;
            setStats((s) => {
              const next = {
                focusSeconds: s.focusSeconds + presetConfig.focusSeconds,
                completedPomos: s.completedPomos + 1,
              };
              if (typeof window !== "undefined") {
                localStorage.setItem(
                  STORAGE_KEYS.stats(todayKey),
                  JSON.stringify(next)
                );
              }
              // 作業セッション完了時だけ、軽い完了演出フラグを立てる
              setJustCompletedWork(true);
              setJustCompletedBreak(false);
              setNextActionHint(nextBreakIsLong ? "長めの休憩に入ります" : "短い休憩に入ります");
              return next;
            });
            setStreak((prev) => {
              if (prev.lastAchievedDate === todayKey && prev.achievedToday) {
                return prev;
              }
              const nextCurrentStreak =
                prev.lastAchievedDate === yesterdayKey ? prev.currentStreak + 1 : 1;
              return {
                currentStreak: nextCurrentStreak,
                lastAchievedDate: todayKey,
                achievedToday: true,
              };
            });
            setTasks((prevTasks) => {
              if (!selectedTaskId) return prevTasks;
              const current = prevTasks.find((t) => t.id === selectedTaskId);
              if (!current) return prevTasks;
              const updated: Task = {
                ...current,
                actualPomodoros: current.actualPomodoros + 1,
              };
              if (authUserId) {
                void updateTaskInSupabase(updated).then((ok) => {
                  if (ok) {
                    setTasks((p) =>
                      p.map((t) => (t.id === selectedTaskId ? updated : t))
                    );
                  } else {
                    console.error("[tasks] ポモ完了の保存に失敗しました（表示は更新していません）");
                  }
                });
                return prevTasks;
              }
              const next = prevTasks.map((task) =>
                task.id === selectedTaskId ? updated : task
              );
              persistTasksToLocalStorage(next);
              return next;
            });
            if (sessionIndex >= SESSIONS_BEFORE_LONG) {
              setMode("longBreak");
              setSeconds(presetConfig.longBreakSeconds);
            } else {
              setMode("shortBreak");
              setSeconds(presetConfig.shortBreakSeconds);
              setSessionIndex((s) => s + 1);
            }
          } else {
            setMode("work");
            setSeconds(presetConfig.focusSeconds);
            setJustCompletedWork(false);
            setJustCompletedBreak(true);
            setNextActionHint("作業に戻ります");
            if (mode === "longBreak") setSessionIndex(1);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode, sessionIndex, selectedTaskId, focusPreset, authUserId]);

  // 完了演出は短時間だけ表示
  useEffect(() => {
    if (!justCompletedWork) return;
    const id = setTimeout(() => setJustCompletedWork(false), 2200);
    return () => clearTimeout(id);
  }, [justCompletedWork]);

  useEffect(() => {
    if (!justCompletedBreak) return;
    const id = setTimeout(() => setJustCompletedBreak(false), 2200);
    return () => clearTimeout(id);
  }, [justCompletedBreak]);

  useEffect(() => {
    if (!justCompletedWork && !justCompletedBreak) return;
    const id = setTimeout(() => setNextActionHint(""), 2200);
    return () => clearTimeout(id);
  }, [justCompletedWork, justCompletedBreak]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(streak));
  }, [streak]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.backgroundTheme, backgroundTheme);
  }, [backgroundTheme]);

  const syncDailyState = useCallback(() => {
    const todayKey = getTodayKey();
    if (activeDateKeyRef.current === todayKey) return;
    activeDateKeyRef.current = todayKey;
    setStats(loadStats());
    setStreak(loadStreak());
  }, []);

  useEffect(() => {
    syncDailyState();
    const intervalId = window.setInterval(syncDailyState, 60 * 1000);
    document.addEventListener("visibilitychange", syncDailyState);
    window.addEventListener("focus", syncDailyState);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", syncDailyState);
      window.removeEventListener("focus", syncDailyState);
    };
  }, [syncDailyState]);

  // 全画面時の最小UI（再生/停止）の表示制御
  const showFullscreenControlsTemporarily = useCallback(
    (ms: number = 3000) => {
      setIsFullscreenControlsVisible(true);
      if (fullscreenControlsHideTimeoutRef.current) {
        window.clearTimeout(fullscreenControlsHideTimeoutRef.current);
      }
      fullscreenControlsHideTimeoutRef.current = window.setTimeout(() => {
        setIsFullscreenControlsVisible(false);
      }, ms);
    },
    []
  );

  useEffect(() => {
    // 全画面の開始/解除時は一旦非表示
    setIsFullscreenControlsVisible(false);
    if (fullscreenControlsHideTimeoutRef.current) {
      window.clearTimeout(fullscreenControlsHideTimeoutRef.current);
      fullscreenControlsHideTimeoutRef.current = null;
    }
  }, [isFullscreenMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.focusPreset, focusPreset);
    if (!isIdle) return;
    setSeconds(getModeSeconds(mode, focusPreset));
  }, [focusPreset, isIdle, mode]);

  // ノイズ再生（作業中のみ）
  // - 無料: 1つのみ
  // - プレミアム: 最大2つを同時再生（均等割り当て）
  const noiseFilesKeyInfo = (() => {
    const ids = (isPremiumUnlocked ? [selectedNoise, selectedNoise2] : [selectedNoise]).filter(
      (id) => id && id !== "none"
    );
    const allowedIds: string[] = [];
    for (const id of ids) {
      const opt = SOUND_OPTIONS.find((o) => o.id === id);
      if (!opt?.file) continue;
      if (opt.isPremium && !isPremiumUnlocked) continue;
      if (!allowedIds.includes(id)) allowedIds.push(id);
    }
    const files = allowedIds
      .map((id) => SOUND_OPTIONS.find((o) => o.id === id)?.file ?? "")
      .filter(Boolean);
    return { allowedIds, files, key: files.join("|") };
  })();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // いったん全部止めて作り直す（簡易実装）
    audioRefs.current.forEach((a) => {
      try {
        a.pause();
      } catch {}
    });
    audioRefs.current = [];

    if (!noiseFilesKeyInfo.files.length) return;

    try {
      const perVolume = (noiseVolume / 100) / noiseFilesKeyInfo.files.length;
      audioRefs.current = noiseFilesKeyInfo.files.map((path) => {
        const audio = new Audio(path);
        audio.loop = true;
        audio.volume = perVolume;
        return audio;
      });

      const shouldPlay = running && mode === "work";
      if (shouldPlay) {
        audioRefs.current.forEach((a) => {
          try {
            a.currentTime = 0;
            void a.play();
          } catch {}
        });
      }
    } catch {
      audioRefs.current = [];
    }
  }, [noiseFilesKeyInfo.key, noiseFilesKeyInfo.files.length, noiseVolume, running, mode, isPremiumUnlocked]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authUserId && !tasksRemoteHydratedRef.current) return;
    if (authUserId) {
      void persistSelectedTaskIdToSupabase(authUserId, selectedTaskId);
    } else if (selectedTaskId) {
      localStorage.setItem(STORAGE_KEYS.selectedTask, selectedTaskId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.selectedTask);
    }
  }, [selectedTaskId, authUserId]);

  // Fullscreen API 同期
  useEffect(() => {
    const doc = typeof document !== "undefined" ? document : null;
    if (!doc) return;
    const onFullscreenChange = () => {
      setIsFullscreenMode(!!doc.fullscreenElement);
    };
    doc.addEventListener("fullscreenchange", onFullscreenChange);
    return () => doc.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const enterFullscreen = useCallback(() => {
    setIsFullscreenMode(true);
    const el = fullscreenRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      try {
        if (el.requestFullscreen) {
          void el.requestFullscreen();
        }
      } catch {
        // fallback: 疑似全画面のみ
      }
    });
  }, []);

  const exitFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        void document.exitFullscreen();
      } else {
        setIsFullscreenMode(false);
      }
    } catch {
      setIsFullscreenMode(false);
    }
  }, []);

  const openTaskQuickPicker = useCallback(() => {
    setIsQuickSettingsOpen(false);
    setIsAppMenuOpen(false);
    setIsTaskQuickPickerOpen(true);
  }, []);

  const toggleTaskQuickPicker = useCallback(() => {
    setIsQuickSettingsOpen(false);
    setIsAppMenuOpen(false);
    setIsTaskQuickPickerOpen((v) => !v);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        exitFullscreen();
        if (isPremiumNoiseUpsellOpen) setIsPremiumNoiseUpsellOpen(false);
        else if (isNoiseModalOpen) setIsNoiseModalOpen(false);
        else if (isThemeModalOpen) setIsThemeModalOpen(false);
        else if (isQuickSettingsOpen) setIsQuickSettingsOpen(false);
        else if (isTaskQuickPickerOpen) setIsTaskQuickPickerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    exitFullscreen,
    isNoiseModalOpen,
    isPremiumNoiseUpsellOpen,
    isThemeModalOpen,
    isQuickSettingsOpen,
    isTaskQuickPickerOpen,
  ]);

  useEffect(() => {
    if (!isPremiumNoiseUpsellOpen) {
      setPremiumCheckoutError(null);
      setPremiumCheckoutLoading(false);
    }
  }, [isPremiumNoiseUpsellOpen]);

  const handleMainButton = useCallback(() => {
    if (timerStatus === "idle") {
      setTimerStatus("running");
    } else if (timerStatus === "running") {
      setTimerStatus("paused");
    } else {
      setTimerStatus("running");
    }
  }, [timerStatus]);

  const handleResume = useCallback(() => {
    setTimerStatus("running");
  }, []);

  const handleRequestStop = useCallback(() => {
    setIsStopConfirmOpen(true);
  }, []);

  const handleCancelStop = useCallback(() => {
    setIsStopConfirmOpen(false);
  }, []);

  const handleConfirmStop = useCallback(() => {
    setTimerStatus("idle");
    setSeconds(getModeSeconds(mode, focusPreset));
    setJustCompletedWork(false);
    setIsStopConfirmOpen(false);
    try {
      audioRefs.current.forEach((a) => {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
      });
    } catch {}
  }, [mode, focusPreset]);

  const handleSelectFocusPreset = useCallback(
    (nextPreset: FocusPresetKey) => {
      if (!isIdle) return;
      setFocusPreset(nextPreset);
      setSeconds(getModeSeconds(mode, nextPreset));
    },
    [isIdle, mode]
  );

  const saveNoise = () => {
    const payload = {
      selectedNoise,
      selectedNoise2: isPremiumUnlocked ? selectedNoise2 : "none",
      noiseVolume,
    };

    if (authUserId) {
      void upsertUserNoisePrefs(authUserId, payload);
    } else if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.noise, JSON.stringify(payload));
    }
    setIsPremiumNoiseUpsellOpen(false);
    setIsNoiseModalOpen(false);
  };

  const previewNoise = (option: SoundOption) => {
    if (option.isPremium && !isPremiumUnlocked) return;
    const path = option.file;
    try {
      audioRefs.current.forEach((a) => {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
      });
      if (!path) return;
      const a = new Audio(path);
      a.volume = noiseVolume / 100;
      a.loop = false;
      void a.play();
      setTimeout(() => a.pause(), 2000);
    } catch {}
  };

  const playDing = useCallback(() => {
    try {
      const a = new Audio("/sounds/ding.mp3");
      a.loop = false;
      // 通知音は小さめが好みなので noiseVolume と無関係にやや控えめ
      a.volume = 0.9;
      void a.play();
    } catch {}
  }, []);

  /** Stripe Checkout へ（サーバーがセッション作成、秘密鍵は API のみ） */
  const startPremiumCheckout = useCallback(async () => {
    setPremiumCheckoutError(null);
    setPremiumCheckoutLoading(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setPremiumCheckoutError(data.error ?? "決済の準備に失敗しました");
        setPremiumCheckoutLoading(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setPremiumCheckoutError("通信に失敗しました");
      setPremiumCheckoutLoading(false);
    }
  }, []);

  /** Stripe Customer Portal（解約・お支払い方法など） */
  const openStripeCustomerPortal = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        console.error("[stripe portal]", data.error ?? "プラン管理を開けませんでした");
        return;
      }
      window.location.assign(data.url);
    } catch {
      console.error("[stripe portal] 通信に失敗しました");
    }
  }, []);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;
  const incompleteTasksForPicker = useMemo(
    () => tasks.filter((t) => !t.completed).slice(0, 5),
    [tasks]
  );
  const modeSeconds = getModeSeconds(mode, focusPreset);
  const elapsedRatio = seconds <= 0 ? 0 : 1 - Math.min(1, Math.max(0, seconds / modeSeconds));

  const noiseTheme = getNoiseTheme(backgroundTheme);

  const mainButtonLabel =
    isIdle
      ? mode === "work"
        ? "集中スタート"
        : "休憩する"
      : isRunning
        ? "一時停止"
        : "続ける";
  const mainButtonWrapClass = isPaused
    ? "flex w-full max-w-sm flex-col gap-4"
    : "flex w-full max-w-[220px] items-center justify-center";
  const mainButtonClass = isPaused
    ? "w-full px-5 py-3 rounded-full text-sm font-medium"
    : "w-full px-8 py-4 rounded-full text-base font-medium";
  settingsQueryHandlersRef.current = {
    openTheme: () => setIsThemeModalOpen(true),
    openNoise: () => {
      setIsPremiumNoiseUpsellOpen(false);
      setIsNoiseModalOpen(true);
    },
    openPremium: () => setIsPremiumNoiseUpsellOpen(true),
    openBilling: () => void openStripeCustomerPortal(),
  };

  const themeModal = (
    <div
      className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-black/60"
      style={{ display: isThemeModalOpen ? "flex" : "none" }}
      onClick={() => setIsThemeModalOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
    >
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-gray-900 text-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="theme-modal-title" className="text-lg font-semibold">
            テーマ
          </h2>
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(false)}
            className="p-2 text-white/70 hover:text-white"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {(() => {
          const immersiveThemes = BACKGROUND_THEMES.filter((t) => t.type === "immersive");
          const pastelThemes = BACKGROUND_THEMES.filter((t) => t.type === "pastel");
          const renderThemeCard = (t: BackgroundTheme) => {
            const active = t.key === backgroundTheme;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setBackgroundTheme(t.key)}
                className={`relative overflow-hidden rounded-2xl border text-left transition ${
                  active
                    ? "border-white/60 ring-1 ring-white/30"
                    : "border-white/10 hover:border-white/25"
                }`}
              >
                <div
                  className="h-24 w-full"
                  style={{ backgroundImage: t.backgroundImage }}
                  aria-hidden
                />
                <div className="absolute inset-0" style={{ background: t.overlay }} aria-hidden />
                <div className="relative p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{t.label}</span>
                    {active && <span className="text-sm">✓</span>}
                  </div>
                  <div className="mt-1 text-[11px] text-white/65">
                    {t.key === "sea"
                      ? "青く静かな海"
                      : t.key === "desert"
                        ? "乾いた夕暮れ"
                        : t.key === "snow"
                          ? "澄んだ雪景色"
                          : t.key === "night"
                            ? "深い夜空"
                            : t.key === "mint"
                              ? "明るいミント"
                              : t.key === "peach"
                                ? "やわらかいピーチ"
                                : t.key === "lavender"
                                  ? "淡いラベンダー"
                                  : "軽やかなスカイ"}
                  </div>
                </div>
              </button>
            );
          };

          return (
            <div className="space-y-5">
              <div>
                <div className="mb-2 text-xs font-semibold text-white/70">没入テーマ</div>
                <div className="grid grid-cols-2 gap-3">{immersiveThemes.map(renderThemeCard)}</div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold text-white/70">ポップテーマ</div>
                <div className="grid grid-cols-2 gap-3">{pastelThemes.map(renderThemeCard)}</div>
              </div>
            </div>
          );
        })()}

        <button
          type="button"
          onClick={() => setIsThemeModalOpen(false)}
          className="mt-5 w-full py-3 rounded-xl bg-white text-gray-900 font-medium hover:bg-white/90"
        >
          閉じる
        </button>
      </div>
    </div>
  );

  const chromeButtonClass =
    "flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xl font-light leading-none hover:bg-white/20 hover:text-white transition";

  // 通常表示（タイマー中心・統計・タスク編集はメニュー先）
  const normalView = (
    <div
      className="relative min-h-dvh flex flex-col bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: noiseTheme.backgroundImage,
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: noiseTheme.overlay }}
        aria-hidden
      />
      {!isFullscreenMode && (
        <>
          {isQuickSettingsOpen ? (
            <div
              className="fixed inset-0 z-[58] bg-black/35"
              aria-hidden
              onClick={() => setIsQuickSettingsOpen(false)}
            />
          ) : null}
          <div className="fixed z-[59] top-[max(12px,env(safe-area-inset-top))] right-[max(12px,env(safe-area-inset-right))] flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsTaskQuickPickerOpen(false);
                setIsQuickSettingsOpen((o) => !o);
              }}
              className={chromeButtonClass}
              aria-label={isQuickSettingsOpen ? "設定メニューを閉じる" : "設定メニューを開く"}
              aria-expanded={isQuickSettingsOpen}
              aria-haspopup="menu"
            >
              <svg
                className="h-[22px] w-[22px] text-white/90"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.06-.7-1.67-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.61.24-1.17.57-1.67.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.06.7 1.67.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.61-.24 1.17-.57 1.67-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </button>
            {isQuickSettingsOpen ? (
              <div
                role="menu"
                aria-label="クイック設定"
                className="w-[min(15rem,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/18 bg-[#0a0e14]/92 py-1 text-white shadow-xl backdrop-blur-md"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full min-h-[44px] items-center px-4 py-2.5 text-left text-[15px] font-medium text-white/90 transition hover:bg-white/10 active:bg-white/12"
                  onClick={() => {
                    setIsQuickSettingsOpen(false);
                    enterFullscreen();
                  }}
                >
                  全画面
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full min-h-[44px] items-center px-4 py-2.5 text-left text-[15px] font-medium text-white/90 transition hover:bg-white/10 active:bg-white/12"
                  onClick={() => {
                    setIsQuickSettingsOpen(false);
                    setIsThemeModalOpen(true);
                  }}
                >
                  テーマ
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full min-h-[44px] items-center px-4 py-2.5 text-left text-[15px] font-medium text-white/90 transition hover:bg-white/10 active:bg-white/12"
                  onClick={() => {
                    setIsQuickSettingsOpen(false);
                    setIsPremiumNoiseUpsellOpen(false);
                    setIsNoiseModalOpen(true);
                  }}
                >
                  ホワイトノイズ
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] text-white sm:px-6">
        {/* 上部: タスク（固定高さ帯・主ブロックの上に補助として配置） */}
        <div className="relative mx-auto w-full max-w-sm shrink-0 space-y-1.5 pt-[max(12px,calc(env(safe-area-inset-top)+52px))] pb-2 sm:max-w-md sm:pb-3">
          <p className="text-[10px] font-medium tracking-[0.16em] text-white/38">現在のタスク</p>
          <div className={isTaskQuickPickerOpen ? "relative z-[60]" : "relative"}>
            {isTaskQuickPickerOpen ? (
              <div
                className="fixed inset-0 z-[58] bg-black/35"
                aria-hidden
                onClick={() => setIsTaskQuickPickerOpen(false)}
              />
            ) : null}
            <div className="flex w-full min-h-[44px] overflow-hidden rounded-2xl border border-white/12 bg-black/25 backdrop-blur-sm transition hover:border-white/18 hover:bg-black/30">
              <button
                type="button"
                onClick={toggleTaskQuickPicker}
                aria-expanded={isTaskQuickPickerOpen}
                aria-haspopup="listbox"
                aria-label={
                  authUserId && tasksRemoteLoading
                    ? "タスク一覧を開く"
                    : selectedTask
                      ? `「${selectedTask.title}」のタスクを変更`
                      : "タスクを選択"
                }
                className="flex min-h-[44px] min-w-0 flex-1 items-center px-3 py-2.5 text-left text-[15px] font-normal leading-snug text-white/88 transition hover:bg-white/[0.06] sm:text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {authUserId && tasksRemoteLoading
                    ? "読み込み中…"
                    : selectedTask
                      ? selectedTask.title
                      : "タスクを選択"}
                </span>
              </button>
              <button
                type="button"
                onClick={openTaskQuickPicker}
                className="shrink-0 border-l border-white/12 px-3 py-2.5 text-[11px] font-medium tabular-nums text-white/70 underline decoration-white/25 underline-offset-[3px] transition hover:bg-white/[0.06] hover:text-white/85"
              >
                変更
              </button>
            </div>
            {isTaskQuickPickerOpen ? (
              <div
                role="listbox"
                aria-label="タスクを選択"
                className="absolute left-0 right-0 top-full z-[59] mt-1.5 overflow-hidden rounded-2xl border border-white/18 bg-[#0a0e14]/95 py-1 text-left shadow-xl backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
              >
                {authUserId && tasksRemoteLoading ? (
                  <p className="px-4 py-3 text-[15px] text-white/55">読み込み中…</p>
                ) : incompleteTasksForPicker.length === 0 ? (
                  <p className="px-4 py-3 text-[15px] leading-snug text-white/55">未完了のタスクがありません</p>
                ) : (
                  <ul className="max-h-[min(280px,45vh)] overflow-y-auto py-0.5">
                    {incompleteTasksForPicker.map((t) => {
                      const active = t.id === selectedTaskId;
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => {
                              setSelectedTaskId(t.id);
                              setIsTaskQuickPickerOpen(false);
                            }}
                            className={`flex w-full min-h-[44px] items-center gap-2 px-4 py-2.5 text-left text-[15px] transition ${
                              active
                                ? "bg-white/14 font-medium text-white ring-1 ring-inset ring-white/20"
                                : "text-white/88 hover:bg-white/10"
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none ${
                                active
                                  ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
                                  : "border-white/15 bg-transparent"
                              }`}
                              aria-hidden
                            >
                              {active ? "✓" : null}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{t.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="border-t border-white/10 px-1 pb-1 pt-0.5">
                  <Link
                    href="/tasks"
                    onClick={() => setIsTaskQuickPickerOpen(false)}
                    className="flex min-h-[44px] w-full items-center justify-center rounded-xl px-3 text-[14px] font-medium text-white/65 transition hover:bg-white/10 hover:text-white/90"
                  >
                    すべてのタスクを見る
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* メイン: タイマー〜プリセット〜開始をまとめて縦方向の視覚中央へ */}
        <div className="relative mx-auto flex min-h-0 w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 py-2 sm:max-w-md sm:gap-5 sm:py-4 max-sm:translate-y-1">
          <div className="flex w-full flex-col items-center gap-2">
            <div
              className={`relative flex aspect-square w-[min(17rem,72vw)] max-h-[min(36vh,300px)] items-center justify-center rounded-full border-2 border-white/25 transition sm:w-72 sm:max-h-[min(40vh,340px)] ${
                justCompletedWork ? "border-white/70 shadow-xl animate-pulse" : ""
              }`}
              style={{ background: "transparent" }}
              aria-label={`${getModeLabel(mode)} ${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
            >
              {justCompletedWork && (
                <div
                  className="absolute inset-[-6px] rounded-full border border-white/30 shadow-[0_0_24px_rgba(255,255,255,0.18)] animate-pulse"
                  aria-hidden
                />
              )}
              {justCompletedWork && (
                <div
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.08) 35%, rgba(0,0,0,0) 60%)",
                  }}
                  aria-hidden
                />
              )}
              <TimerProgressRing
                elapsedRatio={elapsedRatio}
                strokeWidth={3.25}
                className="pointer-events-none absolute inset-0 h-full w-full p-[5px]"
              />
              <div className="relative z-10 flex items-center justify-center px-2 text-center">
                <span className="text-[clamp(2.75rem,11vw,4.5rem)] font-extralight tabular-nums tracking-[0.08em] text-white/95">
                  {String(minutes).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </span>
              </div>
            </div>

            {justCompletedWork && (
              <div className="max-w-sm rounded-full bg-white/10 px-4 py-2 text-center backdrop-blur-sm transition-opacity duration-500 animate-pulse">
                <div className="text-xs font-medium text-white/95">集中、完了！</div>
                {nextActionHint ? (
                  <div className="mt-1 text-[11px] text-white/60">{nextActionHint}</div>
                ) : null}
              </div>
            )}

            {justCompletedBreak && (
              <div className="max-w-sm rounded-full bg-white/10 px-4 py-2 text-center text-xs text-white/70 backdrop-blur-sm">
                {nextActionHint || "作業に戻ります"}
              </div>
            )}
          </div>

          <div
            className={`flex w-full justify-center gap-2.5 sm:gap-3 ${isIdle ? "opacity-100" : "pointer-events-none opacity-45"}`}
            role="group"
            aria-label="集中時間"
          >
            {FOCUS_PRESET_KEYS.map((presetKey) => {
              const preset = getPresetConfig(presetKey);
              const active = focusPreset === presetKey;
              return (
                <button
                  key={presetKey}
                  type="button"
                  disabled={!isIdle}
                  onClick={() => handleSelectFocusPreset(presetKey)}
                  className={`min-w-0 flex-1 rounded-2xl py-3.5 text-sm font-medium tabular-nums transition ${
                    active ? "bg-white/22 text-white ring-1 ring-white/35" : "bg-white/10 text-white/80 hover:bg-white/16"
                  }`}
                >
                  {Math.round(preset.focusSeconds / 60)}分
                </button>
              );
            })}
          </div>

          <div className={`${mainButtonWrapClass} w-full`}>
            {isPaused ? (
              <>
                <button
                  type="button"
                  onClick={handleResume}
                  className={mainButtonClass + " bg-white/90 text-gray-900 hover:bg-white"}
                >
                  続ける
                </button>
                <button
                  type="button"
                  onClick={handleRequestStop}
                  className={
                    mainButtonClass +
                    " border border-white/40 text-white/90 bg-white/5 hover:bg-white/10"
                  }
                >
                  停止する
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleMainButton}
                className={`${mainButtonClass} bg-white/90 text-gray-900 transition hover:bg-white`}
              >
                {mainButtonLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // 全画面用ラッパー（Fullscreen API のターゲット）
  const fullscreenUI = (
    <div
      ref={fullscreenRef}
      className="fixed inset-0 z-50 flex flex-col text-white"
      style={{ display: isFullscreenMode ? "flex" : "none" }}
      onPointerDown={() => showFullscreenControlsTemporarily(2800)}
    >
      {/* 背景は通常画面と同じロジック */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: noiseTheme.backgroundImage }}
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{ background: noiseTheme.overlay }}
        aria-hidden
      />

      {/* 余計なUIを消し、タイマーだけ中央に大きく */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        <div
          className="relative flex items-center justify-center rounded-full border-2 border-white/25"
          style={{
            width: "clamp(280px, 80vw, 520px)",
            height: "clamp(280px, 80vw, 520px)",
          }}
        >
          <TimerProgressRing
            elapsedRatio={elapsedRatio}
            strokeWidth={3.75}
            className="pointer-events-none absolute inset-0 h-full w-full p-[6px]"
          />
          <div className="relative z-10 text-center">
            <div className="text-[clamp(3.5rem,12vw,6rem)] font-light tabular-nums tracking-wider">
              {String(minutes).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* 下中央: 再生/停止（タップで表示→数秒後にフェードアウト） */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 bottom-[max(18px,env(safe-area-inset-bottom))] z-10 flex gap-4 transition-opacity duration-300 ${
            isFullscreenControlsVisible
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-auto"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleMainButton();
              showFullscreenControlsTemporarily(1800);
            }}
            className="flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-sm px-7 py-3 text-sm font-medium text-white/90 hover:bg-white/15"
          >
            {timerStatus === "idle"
              ? "再生"
              : timerStatus === "running"
                ? "一時停止"
                : "続ける"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRequestStop();
              showFullscreenControlsTemporarily(1800);
            }}
            className="flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-sm px-7 py-3 text-sm font-medium text-white/90 hover:bg-white/15"
          >
            停止
          </button>
        </div>
      </div>
    </div>
  );

  const freeSoundOptions = SOUND_OPTIONS.filter((o) => !o.isPremium);
  const premiumAmbientSoundOptions = SOUND_OPTIONS.filter((o) => o.premiumGroup === "ambient");
  const premiumFocusSoundOptions = SOUND_OPTIONS.filter((o) => o.premiumGroup === "focus");

  const selectedLabel1 = SOUND_OPTIONS.find((o) => o.id === selectedNoise)?.label ?? "なし";
  const selectedLabel2 =
    SOUND_OPTIONS.find((o) => o.id === selectedNoise2)?.label ?? "なし";

  const selectedMixSummary = (() => {
    if (selectedNoise === "none") return "選択中: なし";
    if (selectedNoise2 === "none") return `選択中: ${selectedLabel1}`;
    return `選択中: ${selectedLabel1} + ${selectedLabel2}`;
  })();

  const renderNoiseOptionRow = (opt: SoundOption) => {
    const locked = opt.isPremium && !isPremiumUnlocked;
    const isSelected = opt.id === selectedNoise || (selectedNoise2 !== "none" && opt.id === selectedNoise2);
    return (
      <li key={opt.id}>
        <button
          type="button"
          onClick={() => {
            if (locked) {
              setIsPremiumNoiseUpsellOpen(true);
              return;
            }

            if (opt.id === "none") {
              setSelectedNoise("none");
              setSelectedNoise2("none");
              previewNoise(opt);
              return;
            }

            if (!isPremiumUnlocked) {
              setSelectedNoise(opt.id);
              setSelectedNoise2("none");
              previewNoise(opt);
              return;
            }

            // プレミアム: 最大2つを同時選択
            if (opt.id === selectedNoise) {
              if (selectedNoise2 !== "none") {
                setSelectedNoise(selectedNoise2);
                setSelectedNoise2("none");
              } else {
                setSelectedNoise("none");
              }
            } else if (opt.id === selectedNoise2) {
              setSelectedNoise2("none");
            } else {
              if (selectedNoise === "none") {
                setSelectedNoise(opt.id);
              } else if (selectedNoise2 === "none") {
                setSelectedNoise2(opt.id);
              } else {
                // 3つ目は「2つ目」を置き換え（簡易）
                setSelectedNoise2(opt.id);
              }
            }
            previewNoise(opt);
          }}
          className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-left transition ${
            locked
              ? "opacity-70 hover:bg-white/10 cursor-pointer"
              : isSelected
                ? "bg-white/15 ring-1 ring-white/30"
                : "hover:bg-white/10"
          }`}
          aria-label={locked ? `${opt.label}（プレミアム案内を表示）` : opt.label}
        >
          <span className="flex flex-col items-start min-w-0">
            <span className="leading-tight">{opt.label}</span>
            {opt.hint && (
              <span
                className={`mt-0.5 text-[10px] leading-tight ${
                  locked ? "text-white/45" : "text-white/60"
                }`}
              >
                {opt.hint}
              </span>
            )}
          </span>
          <span className="flex items-center gap-2 shrink-0">
            {opt.isPremium && (
              <span
                className="rounded-md border border-amber-300/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100/95"
                aria-hidden
              >
                Premium
              </span>
            )}
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center ${
                isSelected && !locked
                  ? "border-emerald-300/60 bg-emerald-300/15"
                  : "border-white/20 bg-transparent"
              }`}
              aria-hidden
            >
              {isSelected && !locked ? (
                <span className="text-[10px] text-white/90 leading-none">✓</span>
              ) : null}
            </span>
          </span>
        </button>
      </li>
    );
  };

  // ホワイトノイズモーダル
  const noiseModal = (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60"
      style={{ display: isNoiseModalOpen ? "flex" : "none" }}
      onClick={() => {
        setIsPremiumNoiseUpsellOpen(false);
        setIsNoiseModalOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="noise-modal-title"
    >
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-gray-900 text-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="noise-modal-title" className="text-lg font-semibold mb-3">
          ホワイトノイズ
        </h2>
        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[11px] text-white/70 leading-snug">{selectedMixSummary}</p>
        </div>
        <div className="mb-5">
          <label className="block text-sm text-white/70 mb-2">音量</label>
          <input
            type="range"
            min={0}
            max={100}
            value={noiseVolume}
            onChange={(e) => setNoiseVolume(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-white/20 accent-white"
          />
          <span className="text-sm text-white/60">{noiseVolume}%</span>
        </div>
        <div className="mb-6 space-y-4">
          <div>
            <h3 className="text-xs font-medium text-white/45 mb-2 tracking-wide">無料</h3>
            <ul className="space-y-1">{freeSoundOptions.map(renderNoiseOptionRow)}</ul>
          </div>
          <div className="pt-3 border-t border-white/10 space-y-4">
            {isPremiumUnlocked && selectedNoise !== "none" && selectedNoise2 !== "none" && (
              <p className="text-[10px] text-white/45 leading-snug">
                3つ目を選ぶと2つ目が置き換わります
              </p>
            )}
            <div>
              <h3 className="text-xs font-medium text-white/45 mb-2 tracking-wide">プレミアム・環境音</h3>
              <ul className="space-y-1">{premiumAmbientSoundOptions.map(renderNoiseOptionRow)}</ul>
            </div>
            <div className="pt-3 border-t border-white/10">
              <h3 className="text-xs font-medium text-white/45 mb-2 tracking-wide">プレミアム・集中トーン</h3>
              <ul className="space-y-1">{premiumFocusSoundOptions.map(renderNoiseOptionRow)}</ul>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={saveNoise}
          className="w-full py-3 rounded-xl bg-white text-gray-900 font-medium hover:bg-white/90"
        >
          確定
        </button>
      </div>
    </div>
  );

  /** 有料ホワイトノイズタップ時の案内（課金導線は未接続の仮 UI） */
  const premiumNoiseUpsellModal = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4"
      style={{ display: isPremiumNoiseUpsellOpen ? "flex" : "none" }}
      onClick={() => setIsPremiumNoiseUpsellOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-noise-upsell-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-gray-900 border border-white/10 p-5 shadow-xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="premium-noise-upsell-title" className="text-base font-semibold mb-2 leading-snug">
          集中を深めるサウンドを、すべて解放
        </h3>
        <p className="text-sm text-white/70 mb-3 leading-relaxed">
          プレミアムなら、作業に合わせて選べるホワイトノイズがひとまとまり。環境音で余計な雑念を減らし、スイッチを入れたように集中のリズムを整えられます。
        </p>
        <ul className="text-sm text-white/85 space-y-2 mb-4 pl-0 list-none">
          <li className="flex gap-2">
            <span className="text-emerald-400/90 shrink-0" aria-hidden>
              ✓
            </span>
            <span>より集中しやすい<strong className="text-white/95 font-medium"> 追加サウンド</strong>をいつでも利用できる</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400/90 shrink-0" aria-hidden>
              ✓
            </span>
            <span>2つの環境音を<strong className="text-white/95 font-medium">同時に再生</strong>できます</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400/90 shrink-0" aria-hidden>
              ✓
            </span>
            <span>
              <strong className="text-white/95 font-medium">雨・カフェ・チクタク・秒読み</strong> などを今すぐ解放
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400/90 shrink-0" aria-hidden>
              ✓
            </span>
            <span>今後リリースされる新サウンドも、<strong className="text-white/95 font-medium">プレミアムで利用予定</strong></span>
          </li>
        </ul>
        {premiumCheckoutError && (
          <p
            className="text-center text-xs text-red-300/95 mb-3 py-1.5 px-2 rounded-lg bg-red-500/15 border border-red-500/25 leading-snug"
            role="alert"
          >
            {premiumCheckoutError}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={premiumCheckoutLoading}
            className="w-full py-2.5 rounded-xl bg-white text-gray-900 text-sm font-semibold hover:bg-white/90 shadow-sm disabled:opacity-60 disabled:pointer-events-none"
            onClick={() => void startPremiumCheckout()}
          >
            {premiumCheckoutLoading ? "Checkout へ移動中…" : "プレミアムについて見る"}
          </button>
          <button
            type="button"
            className="w-full py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm font-medium text-white/90 hover:bg-white/15"
            onClick={() => setIsPremiumNoiseUpsellOpen(false)}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );

  // 停止確認モーダル
  const stopConfirmModal = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
      style={{ display: isStopConfirmOpen ? "flex" : "none" }}
      onClick={handleCancelStop}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xs mx-4 rounded-2xl bg-[#050713]/95 text-white p-5 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold">ポモドーロを停止しますか？</h2>
        <p className="text-xs text-white/70">
          いまのセッション時間は記録されません。現在の進行はリセットされます。
        </p>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleCancelStop}
            className="flex-1 px-3 py-2 rounded-full text-xs font-medium border border-white/30 text-white/90 bg-transparent hover:bg-white/10"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirmStop}
            className="flex-1 px-3 py-2 rounded-full text-xs font-medium bg-white/90 text-gray-900 hover:bg-white"
          >
            停止する
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <main className="relative min-h-dvh">
      <Suspense fallback={null}>
        <HomeSettingsFromQuery handlersRef={settingsQueryHandlersRef} />
      </Suspense>

      {/* 左上: ハンバーガー（ビューポート固定・全画面時は閉じるボタンを隣に並べる） */}
      <div className="fixed z-[59] top-[max(12px,env(safe-area-inset-top))] left-[max(12px,env(safe-area-inset-left))] flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setIsQuickSettingsOpen(false);
            setIsTaskQuickPickerOpen(false);
            setIsAppMenuOpen(true);
          }}
          className={chromeButtonClass}
          aria-label="メニューを開く"
          aria-expanded={isAppMenuOpen}
        >
          <span aria-hidden>≡</span>
        </button>
        {isFullscreenMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              exitFullscreen();
            }}
            className={`${chromeButtonClass} font-normal text-xl leading-none`}
            aria-label="全画面を閉じる"
          >
            ×
          </button>
        )}
      </div>

      <div className={isFullscreenMode ? "invisible" : ""}>{normalView}</div>

      {fullscreenUI}

      {noiseModal}
      {premiumNoiseUpsellModal}
      {themeModal}
      {stopConfirmModal}

      <AppMenuDrawer open={isAppMenuOpen} onClose={() => setIsAppMenuOpen(false)} />
    </main>
  );
}
