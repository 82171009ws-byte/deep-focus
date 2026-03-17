"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type TimerStatus = "idle" | "running" | "paused";

type PomodoroMode = "work" | "shortBreak" | "longBreak";

const WORK_SECONDS = 25 * 60;
const SHORT_BREAK_SECONDS = 5 * 60;
const LONG_BREAK_SECONDS = 15 * 60;
const SESSIONS_BEFORE_LONG = 4;

function getModeSeconds(mode: PomodoroMode): number {
  switch (mode) {
    case "work":
      return WORK_SECONDS;
    case "shortBreak":
      return SHORT_BREAK_SECONDS;
    case "longBreak":
      return LONG_BREAK_SECONDS;
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

// 集中音ごとの背景テーマ
interface NoiseTheme {
  backgroundImage: string;
  overlay: string;
}

const BASE_BACKGROUND =
  "url(/bg.jpg), linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)";

function getNoiseTheme(noiseId: string, running: boolean): NoiseTheme {
  // 停止・ポーズ時は通常背景に戻す
  if (!running) {
    return {
      backgroundImage: BASE_BACKGROUND,
      overlay: "rgba(0,0,0,0.45)",
    };
  }

  // running 中のみ集中音ごとの没入背景に切り替え
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
      // その他の音は少しだけ雰囲気を変える
      return {
        backgroundImage:
          "linear-gradient(160deg, #15162b 0%, #1c2645 40%, #050712 100%)",
        overlay: "rgba(0,0,0,0.28)",
      };
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

const STORAGE_KEYS = {
  tasks: "focus-tasks",
  stats: (d: string) => `focus-stats-${d}`,
  selectedTask: "focus-selected-task",
  noise: "focus-noise",
  showCompleted: "focus-show-completed",
} as const;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
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
  const [selectedNoise, setSelectedNoise] = useState("none");
  const [noiseVolume, setNoiseVolume] = useState(70);

  useEffect(() => {
    const { selectedNoise: s, noiseVolume: v } = loadNoise();
    setSelectedNoise(s);
    setNoiseVolume(v);
  }, []);

  const [mode, setMode] = useState<PomodoroMode>("work");
  const [seconds, setSeconds] = useState(WORK_SECONDS);
  const [sessionIndex, setSessionIndex] = useState(1);
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<DailyStats>(() => loadStats());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => loadSelectedTaskId());
  const [showCompletedTasks, setShowCompletedTasks] = useState(() => loadShowCompleted());

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const running = timerStatus === "running";

  const saveTasks = useCallback((next: Task[]) => {
    setTasks(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(next));
  }, []);

  // タイマー刻み（既存ロジックを活かす）
  useEffect(() => {
    if (!running) return;
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
                focusSeconds: s.focusSeconds + WORK_SECONDS,
                completedPomos: s.completedPomos + 1,
              };
              if (typeof window !== "undefined")
                localStorage.setItem(STORAGE_KEYS.stats(getTodayKey()), JSON.stringify(next));
              return next;
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
              setSeconds(LONG_BREAK_SECONDS);
            } else {
              setMode("shortBreak");
              setSeconds(SHORT_BREAK_SECONDS);
              setSessionIndex((s) => s + 1);
            }
          } else {
            setMode("work");
            setSeconds(WORK_SECONDS);
            if (mode === "longBreak") setSessionIndex(1);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode, sessionIndex, selectedTaskId]);

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
      if (!selectedTaskId) return;
      setTimerStatus("running");
    } else if (timerStatus === "running") {
      setTimerStatus("paused");
    } else {
      setTimerStatus("running");
    }
  }, [timerStatus, selectedTaskId]);

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
  const modeSeconds = getModeSeconds(mode);
  const elapsedRatio = seconds <= 0 ? 0 : 1 - Math.min(1, Math.max(0, seconds / modeSeconds));

  const noiseTheme = getNoiseTheme(selectedNoise, running);

  const mainButtonLabel =
    timerStatus === "idle" ? "集中スタート" : timerStatus === "running" ? "停止" : "続ける";
  const canStart = !!selectedTaskId;

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
      <div className="relative flex flex-1 flex-col items-center justify-between py-8 px-4 text-white">
        {/* タスク選択エリア */}
        <div className="w-full max-w-md text-center">
          <button
            type="button"
            onClick={() => setTaskDrawerOpen(true)}
            className="text-white/90 text-sm font-medium underline decoration-white/50 underline-offset-2 hover:text-white"
          >
            {selectedTask ? selectedTask.text : "タスクを選んでください…"}
          </button>
        </div>

        {/* 中央: タイマー + リング */}
        <div className="flex flex-col items-center gap-6">
          <div
            className="relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-white/25"
            style={{
              background: "transparent",
            }}
          >
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

          {/* メイン操作ボタン 1 つ */}
          <button
            type="button"
            onClick={handleMainButton}
            disabled={timerStatus === "idle" && !canStart}
            className={`
              min-w-[200px] px-8 py-4 rounded-full text-base font-medium
              transition opacity
              ${timerStatus === "idle" && !canStart ? "bg-white/30 text-white/60 cursor-not-allowed" : "bg-white/90 text-gray-900 hover:bg-white"}
            `}
          >
            {mainButtonLabel}
          </button>
        </div>

        {/* フッター */}
        <footer className="w-full max-w-lg flex items-center justify-around py-4 px-2 border-t border-white/10">
          <button type="button" className="flex flex-col items-center gap-1 text-white/70 text-xs hover:text-white/90">
            <span className="text-lg">◎</span>
            <span>集中モード</span>
          </button>
          <button type="button" className="flex flex-col items-center gap-1 text-white/70 text-xs hover:text-white/90">
            <span className="text-lg">◷</span>
            <span>タイマーのモード</span>
          </button>
          <button
            type="button"
            onClick={enterFullscreen}
            className="flex flex-col items-center gap-1 text-white/70 text-xs hover:text-white/90"
          >
            <span className="text-lg">⛶</span>
            <span>全画面</span>
          </button>
          <button
            type="button"
            onClick={() => setIsNoiseModalOpen(true)}
            className="flex flex-col items-center gap-1 text-white/70 text-xs hover:text-white/90"
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
      className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a] text-white"
      style={{ display: isFullscreenMode ? "flex" : "none" }}
    >
      {/* 左上: 閉じる */}
      <header className="flex items-center justify-between p-4">
        <button
          type="button"
          onClick={exitFullscreen}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
          aria-label="閉じる"
        >
          ×
        </button>
        <button
          type="button"
          onClick={() => setIsNoiseModalOpen(true)}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
          aria-label="ホワイトノイズ"
        >
          ♪
        </button>
      </header>

      {/* 中央: フリップクロック風 4 桁 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <div className="flex items-center gap-1 sm:gap-2">
          <FlipDigit digit={d1} />
          <FlipDigit digit={d2} />
          <span className="text-white/60 text-4xl sm:text-6xl font-light pb-2">:</span>
          <FlipDigit digit={d3} />
          <FlipDigit digit={d4} />
        </div>
        <p className="text-sm text-white/60">{getModeLabel(mode)}</p>
        <button
          type="button"
          onClick={handleMainButton}
          disabled={timerStatus === "idle" && !canStart}
          className={`
            min-w-[200px] px-8 py-4 rounded-full text-base font-medium
            ${timerStatus === "idle" && !canStart ? "bg-white/20 text-white/50 cursor-not-allowed" : "bg-white/90 text-gray-900 hover:bg-white"}
          `}
        >
          {mainButtonLabel}
        </button>
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

  return (
    <main className="relative min-h-dvh">
      {/* 通常表示: 背景 + タイマー + フッター */}
      <div className={isFullscreenMode ? "invisible" : ""}>{normalView}</div>

      {/* 全画面モード UI */}
      {fullscreenUI}

      {/* モーダル類 */}
      {noiseModal}
      {taskSelector}
    </main>
  );
}
