"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// =============================================================================
// Constants & Types
// (将来的: lib/constants.ts, lib/types.ts へ切り出し)
// =============================================================================

const STORAGE_KEYS = {
  tasks: "focus-tasks",
  stats: (date: string) => `focus-stats-${date}`,
  sound: "focus-sound-settings",
  theme: "focus-theme",
  selectedTask: "focus-selected-task",
  showCompleted: "focus-show-completed",
} as const;

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
      return "作業中";
    case "shortBreak":
      return "短休憩";
    case "longBreak":
      return "長休憩";
  }
}

type Theme = "dark" | "light";
type SoundKey = "tukutuku" | "takibi" | "seseragi";

const SOUND_FILES: Record<SoundKey, string> = {
  tukutuku: "/sounds/tukutuku.mp3",
  takibi: "/sounds/takibi.mp3",
  seseragi: "/sounds/seseragi.mp3",
};

function getSoundBackground(
  soundKey: SoundKey,
  isDark: boolean
): { background: string } {
  const opacity = isDark ? 0.12 : 0.08;
  switch (soundKey) {
    case "tukutuku":
      return {
        background: isDark
          ? `linear-gradient(180deg, rgba(34,197,94,${opacity}) 0%, transparent 50%, rgba(22,163,74,${opacity}) 100%)`
          : `linear-gradient(180deg, rgba(34,197,94,${opacity}) 0%, transparent 50%, rgba(22,163,74,${opacity}) 100%)`,
      };
    case "takibi":
      return {
        background: isDark
          ? `linear-gradient(180deg, rgba(234,88,12,${opacity}) 0%, transparent 50%, rgba(194,65,12,${opacity}) 100%)`
          : `linear-gradient(180deg, rgba(234,88,12,${opacity}) 0%, transparent 50%, rgba(194,65,12,${opacity}) 100%)`,
      };
    case "seseragi":
      return {
        background: isDark
          ? `linear-gradient(180deg, rgba(6,182,212,${opacity}) 0%, transparent 50%, rgba(14,165,233,${opacity}) 100%)`
          : `linear-gradient(180deg, rgba(6,182,212,${opacity}) 0%, transparent 50%, rgba(14,165,233,${opacity}) 100%)`,
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

interface SoundSettings {
  soundKey: SoundKey;
  volume: number;
}

// =============================================================================
// Storage Helpers
// (将来的: hooks/useLocalStorage や lib/storage.ts へ切り出し)
// =============================================================================

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tasks);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    return list.map((t: Task) => ({
      ...t,
      actualPomodoros: typeof t.actualPomodoros === "number" ? t.actualPomodoros : 0,
    }));
  } catch {
    return [];
  }
}

function loadStats(): DailyStats {
  if (typeof window === "undefined")
    return { focusSeconds: 0, completedPomos: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.stats(getTodayKey()));
    if (!raw) return { focusSeconds: 0, completedPomos: 0 };
    const parsed = JSON.parse(raw);
    return {
      focusSeconds: Number(parsed?.focusSeconds) || 0,
      completedPomos: Number(parsed?.completedPomos) || 0,
    };
  } catch {
    return { focusSeconds: 0, completedPomos: 0 };
  }
}

function loadSoundSettings(): SoundSettings {
  if (typeof window === "undefined") {
    return { soundKey: "tukutuku", volume: 0.6 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.sound);
    if (!raw) return { soundKey: "tukutuku", volume: 0.6 };
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    const soundKey: SoundKey =
      parsed?.soundKey === "takibi" || parsed?.soundKey === "seseragi"
        ? parsed.soundKey
        : "tukutuku";
    const volume =
      typeof parsed?.volume === "number" && parsed.volume >= 0 && parsed.volume <= 1
        ? parsed.volume
        : 0.6;
    return { soundKey, volume };
  } catch {
    return { soundKey: "tukutuku", volume: 0.6 };
  }
}

function loadTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.theme);
    return raw === "light" || raw === "dark" ? raw : "dark";
  } catch {
    return "dark";
  }
}

function loadSelectedTaskId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.selectedTask);
  } catch {
    return null;
  }
}

function loadShowCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEYS.showCompleted) === "true";
  } catch {
    return false;
  }
}

// =============================================================================
// Page Component
// (将来的: TimerSection, TaskSection, StatsSection, SoundSelector, ThemeToggle へ分割)
// =============================================================================

export default function Home() {
  // --- Pomodoro state ---
  const [mode, setMode] = useState<PomodoroMode>("work");
  const [seconds, setSeconds] = useState(WORK_SECONDS);
  const [sessionIndex, setSessionIndex] = useState(1);
  const [running, setRunning] = useState(false);

  // --- Task state ---
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<DailyStats>(() => loadStats());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    () => loadSelectedTaskId()
  );
  const [showCompletedTasks, setShowCompletedTasks] = useState<boolean>(
    () => loadShowCompleted()
  );

  // --- UI state ---
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const [soundKey, setSoundKey] = useState<SoundKey>(
    () => loadSoundSettings().soundKey
  );
  const [volume] = useState<number>(() => loadSoundSettings().volume);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const saveTasks = useCallback((next: Task[]) => {
    setTasks(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(next));
    }
  }, []);

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setRunning(false);
          try {
            if (audioRef.current) audioRef.current.pause();
          } catch {
            /* ignore */
          }

          if (mode === "work") {
            setStats((prevStats) => {
              const next = {
                focusSeconds: prevStats.focusSeconds + WORK_SECONDS,
                completedPomos: prevStats.completedPomos + 1,
              };
              if (typeof window !== "undefined") {
                localStorage.setItem(
                  STORAGE_KEYS.stats(getTodayKey()),
                  JSON.stringify(next)
                );
              }
              return next;
            });
            setTasks((prevTasks) => {
              if (!selectedTaskId) return prevTasks;
              const next = prevTasks.map((t) =>
                t.id === selectedTaskId
                  ? {
                      ...t,
                      actualPomodoros: (t.actualPomodoros ?? 0) + 1,
                    }
                  : t
              );
              if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(next));
              }
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
            if (mode === "longBreak") {
              setSessionIndex(1);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, mode, sessionIndex, selectedTaskId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const audio = new Audio(SOUND_FILES[soundKey]);
      audio.loop = true;
      audio.volume = volume;
      audioRef.current = audio;
      return () => {
        try {
          audio.pause();
        } catch {
          /* ignore */
        }
      };
    } catch {
      audioRef.current = null;
    }
  }, [soundKey, volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (typeof window === "undefined") return;
    const settings: SoundSettings = { soundKey, volume };
    localStorage.setItem(STORAGE_KEYS.sound, JSON.stringify(settings));
  }, [soundKey, volume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedTaskId) {
      localStorage.setItem(STORAGE_KEYS.selectedTask, selectedTaskId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.selectedTask);
    }
  }, [selectedTaskId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEYS.showCompleted,
      String(showCompletedTasks)
    );
  }, [showCompletedTasks]);

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
    saveTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTask = (id: string) => {
    saveTasks(tasks.filter((t) => t.id !== id));
    setSelectedTaskId((prev) => (prev === id ? null : prev));
  };

  const handleStart = () => {
    setRunning(true);
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        void audioRef.current.play();
      } catch {
        /* ignore - file may be missing */
      }
    }
  };

  const handlePause = () => {
    setRunning(false);
    try {
      if (audioRef.current) audioRef.current.pause();
    } catch {
      /* ignore */
    }
  };

  const handleReset = () => {
    setRunning(false);
    setSeconds(getModeSeconds(mode));
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch {
      /* ignore */
    }
  };

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const focusMinutes = Math.floor(stats.focusSeconds / 60);
  const selectedTask =
    selectedTaskId == null
      ? null
      : tasks.find((t) => t.id === selectedTaskId) ?? null;

  const unfinishedTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const modeSeconds = getModeSeconds(mode);
  const remainingRatio =
    seconds <= 0 ? 0 : Math.min(1, Math.max(0, seconds / modeSeconds));
  const elapsedRatio = 1 - remainingRatio;

  const isDark = theme === "dark";
  const baseBg = isDark ? "#0b0f14" : "#f5f5f7";
  const soundBg = getSoundBackground(soundKey, isDark);

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: baseBg,
        color: isDark ? "#e8edf2" : "#020617",
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          ...soundBg,
        }}
      />
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: "430px",
          width: "100%",
          margin: "0 auto",
          paddingTop: "20px",
          paddingBottom: "120px",
          paddingLeft: "16px",
          paddingRight: "16px",
        }}
      >
        {/* StatsSection: アプリ名 + 今日の集中・完了ポモ */}
        <header
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <h1
            style={{
              fontSize: "18px",
              margin: 0,
              letterSpacing: "0.3px",
              fontWeight: 600,
            }}
          >
            Deep Focus
          </h1>
          <div style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
            <span style={{ color: isDark ? "#9ca3b5" : "#6b7280" }}>
              {focusMinutes}分
            </span>
            <span style={{ color: isDark ? "#4b5563" : "#9ca3af" }}>·</span>
            <span style={{ color: isDark ? "#9ca3b5" : "#6b7280" }}>
              {stats.completedPomos}ポモ
            </span>
          </div>
        </header>

        {/* TimerSection: 選択中タスク + 円形タイマー + Start/Pause/Reset */}
        <section
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            minHeight: 0,
          }}
        >
          {/* 選択中タスク表示 */}
          <div
            style={{
              width: "100%",
              textAlign: "center",
              marginBottom: "16px",
              fontSize: "13px",
              color: isDark ? "#9ca3b5" : "#6b7280",
              minHeight: "20px",
            }}
          >
            {selectedTask ? (
              <span
                style={{
                  color: isDark ? "#e5e7eb" : "#111827",
                  wordBreak: "break-word",
                }}
              >
                {selectedTask.text}
              </span>
            ) : (
              <span>タスクを選んでください</span>
            )}
          </div>

          {/* 円形タイマー: 12時開始・時計回り */}
          <div
            style={{
              position: "relative",
              width: "220px",
              height: "220px",
              flexShrink: 0,
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "999px",
                backgroundImage: `conic-gradient(from 0deg, #38bdf8 0deg, #38bdf8 ${
                  elapsedRatio * 360
                }deg, ${isDark ? "rgba(15,23,42,0.5)" : "rgba(203,213,225,0.6)"} ${elapsedRatio * 360}deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "16px",
                  borderRadius: "999px",
                  background: isDark
                    ? "radial-gradient(circle at 30% 20%, #1e293b, #020617)"
                    : "radial-gradient(circle at 30% 20%, #e5e7eb, #cbd5e1)",
                  boxShadow: isDark
                    ? "0 0 0 1px rgba(148,163,184,0.2)"
                    : "0 0 0 1px rgba(148,163,184,0.25)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "52px",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "1px",
                  }}
                >
                  {minutes}:{secs.toString().padStart(2, "0")}
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "11px",
                    color: isDark ? "#9ca3b5" : "#6b7280",
                    letterSpacing: "0.06em",
                  }}
                >
                  {getModeLabel(mode)}
                </div>
                {mode === "work" && (
                  <div
                    style={{
                      marginTop: "2px",
                      fontSize: "10px",
                      color: isDark ? "#6b7280" : "#9ca3af",
                    }}
                  >
                    {sessionIndex} / {SESSIONS_BEFORE_LONG}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", width: "100%" }}>
            <button
              onClick={handleStart}
              disabled={running}
              style={{
                flex: 1,
                height: "48px",
                fontSize: "15px",
                fontWeight: 500,
                background: running ? "#1d3b6a" : "#2563eb",
                color: "white",
                borderRadius: "14px",
                border: "none",
                cursor: running ? "not-allowed" : "pointer",
                opacity: running ? 0.7 : 1,
                boxShadow: running
                  ? "none"
                  : "0 4px 20px rgba(37,99,235,0.4)",
              }}
            >
              Start
            </button>
            <button
              onClick={handlePause}
              disabled={!running}
              style={{
                flex: 1,
                height: "48px",
                fontSize: "15px",
                fontWeight: 500,
                background: !running
                  ? isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"
                  : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                color: isDark ? "#e5e7eb" : "#111827",
                borderRadius: "14px",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
                cursor: !running ? "not-allowed" : "pointer",
                opacity: !running ? 0.5 : 1,
              }}
            >
              Pause
            </button>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                height: "48px",
                fontSize: "14px",
                background: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
                color: isDark ? "#9ca3b5" : "#6b7280",
                borderRadius: "14px",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </section>

        {/* TaskSection: フル集中モード中は非表示 */}
        {!running && (
        <section
          style={{
            background: isDark ? "#0f1620" : "#ffffff",
            border: `1px solid ${isDark ? "#1b2a3a" : "#e5e7eb"}`,
            borderRadius: "16px",
            padding: "12px 12px 10px",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h2
              style={{
                fontSize: "15px",
                margin: 0,
                fontWeight: 500,
              }}
            >
              Today&apos;s Tasks
            </h2>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="タスクを入力"
              style={{
                flex: 1,
                height: "44px",
                padding: "0 12px",
                fontSize: "13px",
                borderRadius: "12px",
                border: `1px solid ${isDark ? "#2a3b4e" : "#e5e7eb"}`,
                background: isDark ? "#0b0f14" : "#f9fafb",
                color: isDark ? "#e8edf2" : "#020617",
                outline: "none",
              }}
            />
            <button
              onClick={addTask}
              style={{
                height: "44px",
                padding: "0 18px",
                fontSize: "13px",
                background: "#1f2937",
                color: "white",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "10px" }}>
            {unfinishedTasks.map((task) => (
              <li
                key={task.id}
                style={{
                  background: isDark
                    ? task.id === selectedTaskId
                      ? "#020617"
                      : "rgba(15,22,32,0.95)"
                    : "#ffffff",
                  border:
                    task.id === selectedTaskId
                      ? isDark
                        ? "1px solid rgba(148,163,184,0.35)"
                        : "1px solid rgba(37,99,235,0.4)"
                      : `1px solid ${isDark ? "#111827" : "#e5e7eb"}`,
                  borderRadius: "14px",
                  padding: "10px 12px",
                }}
                onClick={() => setSelectedTaskId(task.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleTask(task.id);
                    }}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      accentColor: "#2b6fff",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        lineHeight: 1.35,
                        color: isDark ? "#e5e7eb" : "#111827",
                        wordBreak: "break-word",
                      }}
                    >
                      {task.text}
                    </div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "11px",
                        color: isDark ? "#6b7280" : "#9ca3b5",
                      }}
                    >
                      {task.id === selectedTaskId ? "選択中" : "タップして選択"}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(task.id);
                    }}
                    style={{
                      height: "32px",
                      padding: "0 10px",
                      fontSize: "11px",
                      background: isDark ? "#020617" : "#f9fafb",
                      color: isDark ? "#9ca3b5" : "#4b5563",
                      borderRadius: "10px",
                      border: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {completedTasks.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 0",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: isDark ? "#9ca3b5" : "#6b7280",
                  fontSize: "12px",
                }}
              >
                <span style={{ transform: showCompletedTasks ? "rotate(90deg)" : "none" }}>▶</span>
                <span>完了済みタスク ({completedTasks.length}件)</span>
                <span>{showCompletedTasks ? "非表示" : "表示"}</span>
              </button>
              {showCompletedTasks && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "10px" }}>
                  {completedTasks.map((task) => (
                    <li
                      key={task.id}
                      style={{
                        background: isDark ? "rgba(15,22,32,0.95)" : "#f3f4f6",
                        border: `1px solid ${isDark ? "#111827" : "#e5e7eb"}`,
                        borderRadius: "14px",
                        padding: "10px 12px",
                      }}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleTask(task.id);
                          }}
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            accentColor: "#2b6fff",
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "14px",
                              lineHeight: 1.35,
                              textDecoration: "line-through",
                              color: isDark ? "#9ca3b5" : "#6b7280",
                              wordBreak: "break-word",
                            }}
                          >
                            {task.text}
                          </div>
                          <div
                            style={{
                              marginTop: "4px",
                              fontSize: "11px",
                              color: isDark ? "#6b7280" : "#9ca3b5",
                            }}
                          >
                            完了済み
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                          style={{
                            height: "32px",
                            padding: "0 10px",
                            fontSize: "11px",
                            background: isDark ? "#020617" : "#f9fafb",
                            color: isDark ? "#9ca3b5" : "#4b5563",
                            borderRadius: "10px",
                            border: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
        )}
      </div>

      {/* SoundSelector + ThemeToggle */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "16px 20px",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
          background: isDark
            ? "rgba(11,15,20,0.95)"
            : "rgba(245,245,247,0.95)",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          backdropFilter: "blur(12px)",
        }}
      >
        <select
          value={soundKey}
          onChange={(e) => setSoundKey(e.target.value as SoundKey)}
          aria-label="集中音"
          style={{
            height: "40px",
            padding: "0 14px",
            borderRadius: "12px",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}`,
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.8)",
            color: isDark ? "#e5e7eb" : "#111827",
            fontSize: "13px",
            minWidth: "140px",
          }}
        >
          <option value="tukutuku">ツクツクボウシ</option>
          <option value="takibi">焚き火</option>
          <option value="seseragi">川のせせらぎ</option>
        </select>
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="テーマ切り替え"
          style={{
            height: "40px",
            padding: "0 14px",
            borderRadius: "12px",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}`,
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.8)",
            color: isDark ? "#9ca3b5" : "#6b7280",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
          }}
        >
          <span aria-hidden="true">{isDark ? "☾" : "☼"}</span>
          <span>{isDark ? "ダーク" : "ライト"}</span>
        </button>
      </nav>
    </main>
  );
}
