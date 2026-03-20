"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

// ホワイトノイズ（配列順 = 表示順）。ding.mp3 は完了通知専用のため含めない。
type SoundOption = { id: string; label: string; file: string; isPremium: boolean };

const SOUND_OPTIONS: SoundOption[] = [
  { id: "none", label: "なし", file: "", isPremium: false },
  { id: "tukutuku", label: "ツクツクボウシ", file: "/sounds/tukutuku.mp3", isPremium: false },
  { id: "seseragi", label: "川", file: "/sounds/seseragi.mp3", isPremium: false },
  { id: "takibi", label: "焚き火", file: "/sounds/takibi.mp3", isPremium: false },
  { id: "tick", label: "チクタク", file: "/sounds/tick.mp3", isPremium: true },
  { id: "countdown", label: "秒読み", file: "/sounds/countdown.mp3", isPremium: true },
  { id: "rain", label: "雨", file: "/sounds/rain.mp3", isPremium: true },
  { id: "cafe", label: "カフェ", file: "/sounds/cafe.mp3", isPremium: true },
];

/** 仮実装: 有料プラン判定が入ったらここを差し替え */
const IS_PREMIUM_USER = false;

function normalizeNoiseIdForUser(rawId: string, premiumUser: boolean): string {
  const id = rawId === "count" ? "countdown" : rawId;
  const opt = SOUND_OPTIONS.find((o) => o.id === id);
  if (!opt) return "none";
  if (opt.isPremium && !premiumUser) return "none";
  return id;
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

interface Task {
  id: string;
  text: string;
  completed: boolean;
  actualPomodoros?: number;
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

const DEFAULT_DAILY_GOAL = 3;

const STORAGE_KEYS = {
  tasks: "focus-tasks",
  stats: (d: string) => `focus-stats-${d}`,
  selectedTask: "focus-selected-task",
  noise: "focus-noise",
  focusPreset: "focus-preset",
  dailyGoal: "focus-daily-goal",
  backgroundTheme: "focus-background-theme",
  streak: "focus-streak",
  showCompleted: "focus-show-completed",
} as const;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDateKey(dateKey: string, dayOffset: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function formatDurationLabel(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes > 0 ? `${hours}時間${remainMinutes}分` : `${hours}時間`;
}

function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tasks);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return (Array.isArray(list) ? list : []).map((t: Task) => ({
      ...t,
      actualPomodoros: typeof t.actualPomodoros === "number" ? t.actualPomodoros : 0,
    }));
  } catch {
    return [];
  }
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

function loadDailyGoal(): number {
  if (typeof window === "undefined") return DEFAULT_DAILY_GOAL;
  const raw = Number(localStorage.getItem(STORAGE_KEYS.dailyGoal));
  if (!Number.isFinite(raw)) return DEFAULT_DAILY_GOAL;
  return Math.min(20, Math.max(1, Math.floor(raw)));
}

function loadSelectedTaskId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.selectedTask);
}

function loadNoise(): { selectedNoise: string; noiseVolume: number } {
  if (typeof window === "undefined") return { selectedNoise: "none", noiseVolume: 70 };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.noise);
    if (!raw) return { selectedNoise: "none", noiseVolume: 70 };
    const p = JSON.parse(raw) as { selectedNoise?: string; noiseVolume?: number };
    const rawValue = typeof p?.selectedNoise === "string" ? p.selectedNoise : "none";
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
    const candidate = normalizeNoiseIdForUser(legacyMap[rawValue] ?? rawValue, IS_PREMIUM_USER);
    const vol = typeof p?.noiseVolume === "number" && p.noiseVolume >= 0 && p.noiseVolume <= 100 ? p.noiseVolume : 70;
    return { selectedNoise: candidate, noiseVolume: vol };
  } catch {
    return { selectedNoise: "none", noiseVolume: 70 };
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

function loadShowCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEYS.showCompleted) === "true";
}

// -----------------------------------------------------------------------------
// Flip digit (1 digit for mm:ss)
// -----------------------------------------------------------------------------

function FlipDigit({ digit }: { digit: string }) {
  return (
    <div className="relative flex flex-col items-center justify-center rounded-lg bg-[#0d0d0d] border border-white/10 overflow-hidden shadow-lg min-w-[clamp(3rem,12vw,5rem)] aspect-[3/4] max-h-[20vh] sm:max-h-[28vh]">
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[clamp(2rem,10vw,4.5rem)] font-black tabular-nums text-white/95 drop-shadow-md">
          {digit}
        </span>
      </div>
      <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" aria-hidden />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function Home() {
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");
  const [isNoiseModalOpen, setIsNoiseModalOpen] = useState(false);
  const [isPremiumNoiseUpsellOpen, setIsPremiumNoiseUpsellOpen] = useState(false);
  /** プレミアム CTA 仮クリック時の「近日公開」フィードバック */
  const [showPremiumCtaComingSoon, setShowPremiumCtaComingSoon] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [selectedNoise, setSelectedNoise] = useState("none");
  const [noiseVolume, setNoiseVolume] = useState(70);
  const [justCompletedWork, setJustCompletedWork] = useState(false);
  const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);
  const [isFullscreenControlsVisible, setIsFullscreenControlsVisible] = useState(false);
  const [focusPreset, setFocusPreset] = useState<FocusPresetKey>(() => loadFocusPreset());
  const [streak, setStreak] = useState<StreakState>(() => loadStreak());
  const [dailyGoalPomos, setDailyGoalPomos] = useState<number>(() => loadDailyGoal());
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundThemeKey>(() =>
    loadBackgroundTheme()
  );

  useEffect(() => {
    const { selectedNoise: s, noiseVolume: v } = loadNoise();
    setSelectedNoise(s);
    setNoiseVolume(v);
  }, []);

  const [mode, setMode] = useState<PomodoroMode>("work");
  const [seconds, setSeconds] = useState(() => getModeSeconds("work", loadFocusPreset()));
  const [sessionIndex, setSessionIndex] = useState(1);
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<DailyStats>(() => loadStats());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => loadSelectedTaskId());
  const [showCompletedTasks, setShowCompletedTasks] = useState(() => loadShowCompleted());

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fullscreenControlsHideTimeoutRef = useRef<number | null>(null);
  const activeDateKeyRef = useRef(getTodayKey());

  const isIdle = timerStatus === "idle";
  const isRunning = timerStatus === "running";
  const isPaused = timerStatus === "paused";
  const running = isRunning;
  /** 仮: IS_PREMIUM_USER と同期（将来コンポーネント内で動的に） */
  const isPremiumUser = IS_PREMIUM_USER;

  // 無料ユーザーなのに有料音が選ばれている場合は「なし」へ（ストレージずれ・将来のフラグ変更にも対応）
  useEffect(() => {
    const opt = SOUND_OPTIONS.find((o) => o.id === selectedNoise);
    if (opt?.isPremium && !isPremiumUser) {
      setSelectedNoise("none");
    }
  }, [selectedNoise, isPremiumUser]);

  const saveTasks = useCallback((next: Task[]) => {
    setTasks(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(next));
  }, []);

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
            if (audioRef.current) audioRef.current.pause();
          } catch {}
          if (mode === "work") {
            // 作業セッション終了時のみ通知音を1回鳴らす（休憩終了では鳴らさない）
            playDing();
            setStats((s) => {
              const next = {
                focusSeconds: s.focusSeconds + presetConfig.focusSeconds,
                completedPomos: s.completedPomos + 1,
              };
              if (typeof window !== "undefined") {
                localStorage.setItem(
                  STORAGE_KEYS.stats(getTodayKey()),
                  JSON.stringify(next)
                );
              }
              // 作業セッション完了時だけ、軽い完了演出フラグを立てる
              setJustCompletedWork(true);
              return next;
            });
            setStreak((prev) => {
              const todayKey = getTodayKey();
              if (prev.lastAchievedDate === todayKey && prev.achievedToday) {
                return prev;
              }
              const yesterdayKey = shiftDateKey(todayKey, -1);
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
              const next = prevTasks.map((task) =>
                task.id === selectedTaskId
                  ? { ...task, actualPomodoros: (task.actualPomodoros ?? 0) + 1 }
                  : task
              );
              if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(next));
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
            if (mode === "longBreak") setSessionIndex(1);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode, sessionIndex, selectedTaskId, focusPreset]);

  // 完了演出は短時間だけ表示
  useEffect(() => {
    if (!justCompletedWork) return;
    const id = setTimeout(() => setJustCompletedWork(false), 2200);
    return () => clearTimeout(id);
  }, [justCompletedWork]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(streak));
  }, [streak]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.dailyGoal, String(dailyGoalPomos));
  }, [dailyGoalPomos]);

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

  // ノイズ再生（作業中のみ）。無料ユーザーは有料音の file を渡さない（再生ガード）
  const noisePath = (() => {
    const opt = SOUND_OPTIONS.find((o) => o.id === selectedNoise);
    if (!opt?.file) return "";
    if (opt.isPremium && !isPremiumUser) return "";
    return opt.file;
  })();
  useEffect(() => {
    if (typeof window === "undefined" || !noisePath) {
      audioRef.current = null;
      return;
    }
    try {
      const audio = new Audio(noisePath);
      audio.loop = true;
      audio.volume = noiseVolume / 100;
      audioRef.current = audio;
      return () => {
        try {
          audio.pause();
        } catch {}
      };
    } catch {
      audioRef.current = null;
    }
  }, [noisePath, noiseVolume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = noiseVolume / 100;
  }, [noiseVolume]);

  useEffect(() => {
    if (!audioRef.current) return;
    const shouldPlay = running && mode === "work" && !!noisePath;
    try {
      if (shouldPlay) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    } catch {}
  }, [running, mode, noisePath, isPremiumUser]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedTaskId) localStorage.setItem(STORAGE_KEYS.selectedTask, selectedTaskId);
    else localStorage.removeItem(STORAGE_KEYS.selectedTask);
  }, [selectedTaskId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.showCompleted, String(showCompletedTasks));
  }, [showCompletedTasks]);

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        exitFullscreen();
        if (isPremiumNoiseUpsellOpen) setIsPremiumNoiseUpsellOpen(false);
        else if (isNoiseModalOpen) setIsNoiseModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitFullscreen, isNoiseModalOpen, isPremiumNoiseUpsellOpen]);

  useEffect(() => {
    if (!isPremiumNoiseUpsellOpen) setShowPremiumCtaComingSoon(false);
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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
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

  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      actualPomodoros: 0,
    };
    saveTasks([...tasks, newTask]);
    setInput("");
  };

  const toggleTask = (id: string) => {
    saveTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTask = (id: string) => {
    saveTasks(tasks.filter((t) => t.id !== id));
    setSelectedTaskId((prev) => (prev === id ? null : prev));
  };

  const saveNoise = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        STORAGE_KEYS.noise,
        JSON.stringify({ selectedNoise, noiseVolume })
      );
    }
    setIsPremiumNoiseUpsellOpen(false);
    setIsNoiseModalOpen(false);
  };

  const previewNoise = (option: SoundOption) => {
    if (option.isPremium && !isPremiumUser) return;
    const path = option.file;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
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

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;
  const unfinishedTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
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
  const contentGapClass = isPaused
    ? "gap-3 sm:gap-4"
    : "gap-4 sm:gap-5";
  const footerClass = isPaused
    ? "w-full max-w-lg grid grid-cols-3 items-center gap-x-1 sm:gap-x-2 pt-3 pb-[max(8px,env(safe-area-inset-bottom))] px-2 border-t border-white/10"
    : "w-full max-w-lg grid grid-cols-3 items-center gap-x-1 sm:gap-x-2 pt-4 pb-[max(10px,env(safe-area-inset-bottom))] px-2 border-t border-white/10";
  const fullscreenContentGapClass = isPaused
    ? "gap-4 px-4"
    : "gap-5 px-4";

  const renderPresetSelector = (wrapperClassName: string) => (
    <div className={wrapperClassName}>
      <div className="mb-2 flex items-center justify-center gap-2 text-[11px] text-white/60">
        <span>集中時間</span>
        <span className="h-px w-8 bg-white/20" aria-hidden />
        <span>{getPresetConfig(focusPreset).label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {FOCUS_PRESET_KEYS.map((presetKey) => {
          const preset = getPresetConfig(presetKey);
          const isActivePreset = focusPreset === presetKey;
          const isDisabled = !isIdle;
          return (
            <button
              key={presetKey}
              type="button"
              onClick={() => handleSelectFocusPreset(presetKey)}
              disabled={isDisabled}
              className={`
                flex min-h-[72px] flex-col items-center justify-center rounded-2xl px-2 py-2 text-center transition
                ${isActivePreset ? "bg-white/20 text-white ring-1 ring-white/30" : "bg-white/10 text-white/80 hover:bg-white/15"}
                ${isDisabled ? "cursor-not-allowed opacity-55" : ""}
              `}
            >
              <span className="text-[11px] font-medium leading-tight">{preset.label}</span>
              <span className="mt-1 text-base font-semibold tabular-nums">
                {Math.round(preset.focusSeconds / 60)}分
              </span>
              <span className="mt-0.5 text-[10px] text-white/55">
                休憩 {Math.round(preset.shortBreakSeconds / 60)}分
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderTodaySummary = (wrapperClassName: string) => (
    <div className={wrapperClassName}>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/10 px-3 py-2 text-center backdrop-blur-sm">
          <div className="text-[10px] text-white/55">今日の集中時間</div>
          <div className="mt-1 text-sm font-semibold text-white tabular-nums">
            {formatDurationLabel(stats.focusSeconds)}
          </div>
        </div>
        <div
          className={`rounded-2xl bg-white/10 px-3 py-2 text-center backdrop-blur-sm transition-transform duration-500 ${
            justCompletedWork ? "scale-[1.03] bg-white/20" : ""
          }`}
        >
          <div className="text-[10px] text-white/55">完了ポモ数</div>
          <div className={`mt-1 text-sm font-semibold text-white tabular-nums ${justCompletedWork ? "animate-pulse" : ""}`}>
            {stats.completedPomos}
          </div>
        </div>
        <div
          className={`rounded-2xl bg-white/10 px-3 py-2 text-center backdrop-blur-sm transition-transform duration-500 ${
            justCompletedWork ? "scale-[1.03] bg-white/20" : ""
          }`}
        >
          <div className="text-[10px] text-white/55">連続記録</div>
          <div className={`mt-1 text-sm font-semibold text-white tabular-nums ${justCompletedWork ? "animate-pulse" : ""}`}>
            {streak.currentStreak}日
          </div>
        </div>
      </div>

      <div
        className={`mt-2 rounded-2xl bg-white/10 px-3 py-3 text-center backdrop-blur-sm transition-transform duration-500 ${
          stats.completedPomos >= dailyGoalPomos ? "ring-1 ring-emerald-300/25" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-left">
            <div className="text-[10px] text-white/55">今日の目標</div>
            <div className={`mt-1 text-sm font-semibold text-white tabular-nums ${justCompletedWork ? "animate-pulse" : ""}`}>
              {stats.completedPomos} / {dailyGoalPomos}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[10px] text-white/55">
            <span>目標変更</span>
            <select
              value={dailyGoalPomos}
              onChange={(e) => setDailyGoalPomos(Number(e.target.value))}
              className="rounded-full bg-white/10 px-2 py-1 text-xs text-white outline-none ring-1 ring-white/15"
              aria-label="今日の目標ポモ数"
            >
              {Array.from({ length: 20 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value} className="text-gray-900">
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );

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

  // フリップ用 4 桁: [m1, m2, s1, s2]
  const d1 = String(Math.floor(minutes / 10));
  const d2 = String(minutes % 10);
  const d3 = String(Math.floor(secs / 10));
  const d4 = String(secs % 10);

  // 通常表示
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
      <div className="relative flex flex-1 flex-col items-center justify-between px-4 pt-6 pb-[max(14px,env(safe-area-inset-bottom))] text-white sm:pt-8 sm:pb-[max(18px,env(safe-area-inset-bottom))]">
        {/* タスク選択エリア */}
        <div className="w-full max-w-md text-center pt-1">
          <button
            type="button"
            onClick={() => setTaskDrawerOpen(true)}
            className="text-white/90 text-sm font-medium underline decoration-white/50 underline-offset-2 hover:text-white"
          >
            {selectedTask ? selectedTask.text : "タスクを選んでください…"}
          </button>
        </div>

        {/* 中央: タイマー + リング */}
        <div className={`flex flex-col items-center ${contentGapClass}`}>
          <div
            className={`relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-white/25 transition
              ${justCompletedWork ? "border-white/70 shadow-xl animate-pulse" : ""}`}
            style={{
              background: "transparent",
            }}
          >
            {justCompletedWork && (
              <div
                className="absolute inset-[-6px] rounded-full border border-white/30 shadow-[0_0_24px_rgba(255,255,255,0.18)] animate-pulse"
                aria-hidden
              />
            )}
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent"
              style={{
                background: `conic-gradient(from 0deg, rgba(255,255,255,0.5) 0deg, rgba(255,255,255,0.5) ${elapsedRatio * 360}deg, transparent ${elapsedRatio * 360}deg)`,
              }}
            />
            <div className="relative z-10 text-center">
              <span className="text-5xl sm:text-6xl font-light tabular-nums tracking-wider">
                {String(minutes).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
              <p className="mt-1 text-xs text-white/70">{getModeLabel(mode)}</p>
            </div>
          </div>

          {/* 作業セッション完了メッセージ */}
          {justCompletedWork && (
            <div className="mt-0.5 text-xs text-emerald-50/90 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm transition-opacity duration-500 animate-pulse">
              1セッション完了
            </div>
          )}

          {renderPresetSelector(
            `w-full max-w-sm ${isIdle ? "opacity-100" : "opacity-70"}`
          )}

          {/* メイン操作ボタン（状態別） */}
          <div className={mainButtonWrapClass}>
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
                className={mainButtonClass + " border border-white/40 text-white/90 bg-white/5 hover:bg-white/10"}
              >
                停止する
              </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleMainButton}
                className={`
                  ${mainButtonClass}
                  transition opacity
                  bg-white/90 text-gray-900 hover:bg-white
                `}
              >
                {mainButtonLabel}
              </button>
            )}
          </div>

          {renderTodaySummary("w-full max-w-sm")}
        </div>

        {/* フッター */}
        <footer className={footerClass}>
          <div className="flex min-w-0 justify-start items-center">
            <button
              type="button"
              onClick={() => setIsThemeModalOpen(true)}
              className="flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-xl text-white/75 text-xs hover:text-white/95 hover:bg-white/5"
            >
              <span className="text-lg">◼︎</span>
              <span className="text-center leading-tight">テーマ</span>
            </button>
          </div>
          <div className="flex min-w-0 justify-center items-center">
            <button
              type="button"
              onClick={enterFullscreen}
              className="flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-xl text-white/75 text-xs hover:text-white/95 hover:bg-white/5"
            >
              <span className="text-lg">⛶</span>
              <span>全画面</span>
            </button>
          </div>
          <div className="flex min-w-0 justify-end items-center">
            <button
              type="button"
              onClick={() => {
              setIsPremiumNoiseUpsellOpen(false);
              setIsNoiseModalOpen(true);
            }}
              className="flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-xl text-white/75 text-xs hover:text-white/95 hover:bg-white/5"
            >
              <span className="text-lg">♪</span>
              <span className="text-center leading-tight">ホワイトノイズ</span>
            </button>
          </div>
        </footer>
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

      {/* 左上: 閉じるボタン（全画面解除のみ、タイマー状態は維持） */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          exitFullscreen();
        }}
        className="fixed top-[max(12px,env(safe-area-inset-top))] left-[max(12px,env(safe-area-inset-left))] z-20 flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xl leading-none hover:bg-white/20 hover:text-white transition"
        aria-label="全画面を閉じる"
      >
        ×
      </button>

      {/* 余計なUIを消し、タイマーだけ中央に大きく */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        <div
          className="relative flex items-center justify-center rounded-full border-2 border-white/25"
          style={{
            width: "clamp(280px, 80vw, 520px)",
            height: "clamp(280px, 80vw, 520px)",
          }}
        >
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              background: `conic-gradient(from 0deg, rgba(255,255,255,0.55) 0deg, rgba(255,255,255,0.55) ${elapsedRatio * 360}deg, transparent ${elapsedRatio * 360}deg)`,
            }}
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
  const premiumSoundOptions = SOUND_OPTIONS.filter((o) => o.isPremium);

  const renderNoiseOptionRow = (opt: SoundOption) => {
    const locked = opt.isPremium && !isPremiumUser;
    return (
      <li key={opt.id}>
        <button
          type="button"
          onClick={() => {
            if (locked) {
              setIsPremiumNoiseUpsellOpen(true);
              return;
            }
            setSelectedNoise(opt.id);
            previewNoise(opt);
          }}
          className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-left transition ${
            locked
              ? "opacity-70 hover:bg-white/10 cursor-pointer"
              : selectedNoise === opt.id
                ? "bg-white/15 ring-1 ring-white/30"
                : "hover:bg-white/10"
          }`}
          aria-label={locked ? `${opt.label}（プレミアム案内を表示）` : opt.label}
        >
          <span>{opt.label}</span>
          <span className="flex items-center gap-2 shrink-0">
            {opt.isPremium && (
              <span
                className="rounded-md border border-amber-300/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100/95"
                aria-hidden
              >
                Premium
              </span>
            )}
            {selectedNoise === opt.id && !locked && <span className="text-white">✓</span>}
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
        <h2 id="noise-modal-title" className="text-lg font-semibold mb-4">
          ホワイトノイズ
        </h2>
        <div className="mb-4">
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
          <div className="pt-3 border-t border-white/10">
            <h3 className="text-xs font-medium text-white/45 mb-2 tracking-wide">プレミアム</h3>
            <ul className="space-y-1">{premiumSoundOptions.map(renderNoiseOptionRow)}</ul>
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
        {showPremiumCtaComingSoon && (
          <p
            className="text-center text-xs text-amber-200/90 mb-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20"
            role="status"
          >
            課金・登録は近日公開予定です
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="w-full py-2.5 rounded-xl bg-white text-gray-900 text-sm font-semibold hover:bg-white/90 shadow-sm"
            onClick={() => {
              if (typeof window !== "undefined") {
                console.log("[Deep Focus] Premium CTA: プレミアムについて見る（Stripe 等は未接続）");
              }
              setShowPremiumCtaComingSoon(true);
            }}
          >
            プレミアムについて見る
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

  // タスク選択ドロワー（簡易: タスク未選択時は「タスクを選んでください」クリックで開く想定）
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const taskSelector = (
    <div
      className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/50"
      style={{ display: taskDrawerOpen ? "flex" : "none" }}
      onClick={() => setTaskDrawerOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-gray-900 text-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">タスクを選択</h2>
          <button type="button" onClick={() => setTaskDrawerOpen(false)} className="p-2 text-white/70 hover:text-white">
            ×
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="新しいタスク"
            className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40"
          />
          <button
            type="button"
            onClick={addTask}
            className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white"
          >
            追加
          </button>
        </div>
        <ul className="space-y-2">
          {unfinishedTasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedTaskId(task.id);
                  setTaskDrawerOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${selectedTaskId === task.id ? "bg-white/15 ring-1 ring-white/30" : "hover:bg-white/10"}`}
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleTask(task.id);
                  }}
                  className="rounded"
                />
                <span className="flex-1">{task.text}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(task.id);
                  }}
                  className="text-white/50 hover:text-red-400 text-sm"
                >
                  削除
                </button>
              </button>
            </li>
          ))}
        </ul>
        {completedTasks.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
              className="text-sm text-white/60 hover:text-white/80"
            >
              {showCompletedTasks ? "▼" : "▶"} 完了済み ({completedTasks.length})
            </button>
            {showCompletedTasks && (
              <ul className="mt-2 space-y-1">
                {completedTasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 px-4 py-2 text-white/50 text-sm line-through">
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleTask(task.id)}
                      className="rounded"
                    />
                    {task.text}
                    <button type="button" onClick={() => deleteTask(task.id)} className="text-red-400/80 text-xs">
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
      {/* 通常表示: 背景 + タイマー + フッター */}
      <div className={isFullscreenMode ? "invisible" : ""}>{normalView}</div>

      {/* 全画面モード UI */}
      {fullscreenUI}

      {/* モーダル類 */}
      {noiseModal}
      {premiumNoiseUpsellModal}
      {themeModal}
      {stopConfirmModal}
      {taskSelector}
    </main>
  );
}
