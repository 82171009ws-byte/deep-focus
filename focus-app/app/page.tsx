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
type NoiseBackgroundMode = "auto" | "manual";

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

// ホワイトノイズ選択肢（id: 内部キー, label: 表示名）
const NOISE_OPTIONS: { id: string; label: string; path: string }[] = [
  { id: "none", label: "なし", path: "" },
  { id: "tick", label: "チクタク", path: "/sounds/tick.mp3" },
  { id: "count", label: "秒読み", path: "/sounds/count.mp3" },
  { id: "tukutuku", label: "ツクツクボウシ", path: "/sounds/tukutuku.mp3" },
  { id: "rain", label: "雨", path: "/sounds/rain.mp3" },
  { id: "seseragi", label: "川", path: "/sounds/seseragi.mp3" },
  { id: "takibi", label: "焚き火", path: "/sounds/takibi.mp3" },
  { id: "cafe", label: "カフェ", path: "/sounds/cafe.mp3" },
];

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

// 集中音ごとの背景テーマ
interface NoiseTheme {
  backgroundImage: string;
  overlay: string;
}

function getNoiseTheme(
  noiseId: string,
  running: boolean,
  baseTheme: BackgroundThemeKey,
  noiseBackgroundMode: NoiseBackgroundMode
): NoiseTheme {
  const base = getBackgroundTheme(baseTheme);
  if (noiseBackgroundMode === "manual") {
    return { backgroundImage: base.backgroundImage, overlay: base.overlay };
  }
  // 停止・ポーズ時は通常背景に戻す
  if (!running) {
    return {
      backgroundImage: base.backgroundImage,
      overlay: base.overlay,
    };
  }

  // running 中のみ「対応する集中音テーマ」がある場合に上書きする
  switch (noiseId) {
    case "takibi":
      // 暖色の暗い背景
      return {
        backgroundImage:
          "radial-gradient(circle at 20% 0%, #ffb347 0%, #ff7b3b 18%, #4a1b0f 48%, #050308 100%)",
        overlay: "rgba(0,0,0,0.25)",
      };
    case "seseragi":
      // 青系の静かな背景
      return {
        backgroundImage:
          "linear-gradient(135deg, #021b3a 0%, #035f73 40%, #0b1b33 70%, #020611 100%)",
        overlay: "rgba(0,0,0,0.25)",
      };
    case "tukutuku":
      // ツクツクボウシ（夏の緑系背景）
      return {
        backgroundImage:
          "linear-gradient(135deg, #05210f 0%, #0b4a24 35%, #0c6f34 55%, #04120a 100%)",
        overlay: "rgba(0,0,0,0.22)",
      };
    default:
      // 対応テーマがない音（なし/チクタク/秒読み/雨/カフェなど）は選択テーマを維持
      return { backgroundImage: base.backgroundImage, overlay: base.overlay };
  }
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
  noiseBackgroundMode: "focus-noise-background-mode",
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
      秒読み: "count",
      こおろぎ: "tukutuku",
      雨: "rain",
      川: "seseragi",
      焚き火: "takibi",
      カフェ: "cafe",
    };
    const candidate =
      legacyMap[rawValue] ??
      (NOISE_OPTIONS.some((o) => o.id === rawValue) ? rawValue : "none");
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

function loadNoiseBackgroundMode(): NoiseBackgroundMode {
  if (typeof window === "undefined") return "auto";
  const raw = localStorage.getItem(STORAGE_KEYS.noiseBackgroundMode);
  if (raw === "auto" || raw === "manual") return raw;
  return "auto";
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
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [selectedNoise, setSelectedNoise] = useState("none");
  const [noiseVolume, setNoiseVolume] = useState(70);
  const [justCompletedWork, setJustCompletedWork] = useState(false);
  const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);
  const [focusPreset, setFocusPreset] = useState<FocusPresetKey>(() => loadFocusPreset());
  const [streak, setStreak] = useState<StreakState>(() => loadStreak());
  const [dailyGoalPomos, setDailyGoalPomos] = useState<number>(() => loadDailyGoal());
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundThemeKey>(() =>
    loadBackgroundTheme()
  );
  const [noiseBackgroundMode, setNoiseBackgroundMode] = useState<NoiseBackgroundMode>(() =>
    loadNoiseBackgroundMode()
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
  const activeDateKeyRef = useRef(getTodayKey());

  const isIdle = timerStatus === "idle";
  const isRunning = timerStatus === "running";
  const isPaused = timerStatus === "paused";
  const running = isRunning;

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.noiseBackgroundMode, noiseBackgroundMode);
  }, [noiseBackgroundMode]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.focusPreset, focusPreset);
    if (!isIdle) return;
    setSeconds(getModeSeconds(mode, focusPreset));
  }, [focusPreset, isIdle, mode]);

  // ノイズ再生（選択中のみ、running のとき再生）
  const noisePath = NOISE_OPTIONS.find((o) => o.id === selectedNoise)?.path ?? "";
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
    if (running && audioRef.current && noisePath) {
      try {
        audioRef.current.currentTime = 0;
        void audioRef.current.play();
      } catch {}
    } else if (!running && audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
    }
  }, [running, noisePath]);

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
        if (isNoiseModalOpen) setIsNoiseModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitFullscreen, isNoiseModalOpen]);

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
    setIsNoiseModalOpen(false);
  };

  const previewNoise = (path: string) => {
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

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;
  const unfinishedTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const modeSeconds = getModeSeconds(mode, focusPreset);
  const elapsedRatio = seconds <= 0 ? 0 : 1 - Math.min(1, Math.max(0, seconds / modeSeconds));

  const noiseTheme = getNoiseTheme(
    selectedNoise,
    running,
    backgroundTheme,
    noiseBackgroundMode
  );
  const currentPresetConfig = getPresetConfig(focusPreset);
  const currentBackgroundTheme = getBackgroundTheme(backgroundTheme);

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
    ? "w-full max-w-lg flex items-center justify-around pt-3 pb-[max(8px,env(safe-area-inset-bottom))] px-2 border-t border-white/10"
    : "w-full max-w-lg flex items-center justify-around pt-4 pb-[max(10px,env(safe-area-inset-bottom))] px-2 border-t border-white/10";
  const fullscreenContentGapClass = isPaused
    ? "gap-4 px-4"
    : "gap-5 px-4";

  const renderPresetSelector = (wrapperClassName: string) => (
    <div className={wrapperClassName}>
      <div className="mb-2 flex items-center justify-center gap-2 text-[11px] text-white/60">
        <span>集中時間</span>
        <span className="h-px w-8 bg-white/20" aria-hidden />
        <span>{currentPresetConfig.label}</span>
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

        <div className="mb-4 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
          <div>
            <div className="text-sm font-semibold">音に合わせて背景を変える</div>
            <div className="mt-0.5 text-[11px] text-white/60">
              ON: 実行中のみ集中音テーマ / OFF: 常に選択テーマ
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setNoiseBackgroundMode((m) => (m === "auto" ? "manual" : "auto"))
            }
            className={`relative h-7 w-12 rounded-full transition ${
              noiseBackgroundMode === "auto" ? "bg-emerald-400/60" : "bg-white/15"
            }`}
            aria-pressed={noiseBackgroundMode === "auto"}
            aria-label="音に合わせて背景を変える"
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                noiseBackgroundMode === "auto" ? "left-6" : "left-0.5"
              }`}
              aria-hidden
            />
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
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-white/75 text-xs hover:text-white/95 hover:bg-white/5"
          >
            <span className="text-lg">◼︎</span>
            <span>テーマ</span>
          </button>
          <button
            type="button"
            onClick={enterFullscreen}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-white/75 text-xs hover:text-white/95 hover:bg-white/5"
          >
            <span className="text-lg">⛶</span>
            <span>全画面</span>
          </button>
          <button
            type="button"
            onClick={() => setIsNoiseModalOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-white/75 text-xs hover:text-white/95 hover:bg-white/5"
          >
            <span className="text-lg">♪</span>
            <span>ホワイトノイズ</span>
          </button>
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
      </div>
    </div>
  );

  // ホワイトノイズモーダル
  const noiseModal = (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60"
      style={{ display: isNoiseModalOpen ? "flex" : "none" }}
      onClick={() => setIsNoiseModalOpen(false)}
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
        <ul className="space-y-1 mb-6">
          {NOISE_OPTIONS.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedNoise(opt.id);
                  if (opt.path) previewNoise(opt.path);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition ${selectedNoise === opt.id ? "bg-white/15 ring-1 ring-white/30" : "hover:bg-white/10"}`}
              >
                <span>{opt.label}</span>
                {selectedNoise === opt.id && <span className="text-white">✓</span>}
              </button>
            </li>
          ))}
        </ul>
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
      {themeModal}
      {stopConfirmModal}
      {taskSelector}
    </main>
  );
}
