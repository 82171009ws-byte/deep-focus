"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  hydrateLocalTasks,
  hydrateRemoteTasks,
  migrateLocalTasksIfNeeded,
} from "@/lib/taskSessionSync";
import {
  SELECTED_TASK_LOCAL_STORAGE_KEY,
  deleteTaskFromSupabase,
  insertTaskToSupabase,
  persistSelectedTaskIdToSupabase,
  updateTaskInSupabase,
} from "@/lib/tasksSupabase";
import { persistTasksToLocalStorage, type Task } from "@/lib/tasksLocal";

const SHOW_COMPLETED_KEY = "focus-show-completed";

function loadShowCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SHOW_COMPLETED_KEY) === "true";
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [tasksRemoteLoading, setTasksRemoteLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session ?? null;
      const uid = session?.user?.id ?? null;
      setAuthUserId(uid);

      if (!uid) {
        const local = hydrateLocalTasks();
        setTasks(local.tasks);
        setSelectedTaskId(local.selectedTaskId);
        setShowCompletedTasks(loadShowCompleted());
        setTasksRemoteLoading(false);
        setHydrated(true);
        return;
      }

      setTasksRemoteLoading(true);
      const mig = await migrateLocalTasksIfNeeded(session);
      if (!mounted) return;
      if (!mig.ok) {
        console.error("[tasks page] migrate:", mig.error);
        setTasksRemoteLoading(false);
        setHydrated(true);
        return;
      }
      const remote = await hydrateRemoteTasks(session);
      if (!mounted) return;
      setTasksRemoteLoading(false);
      setHydrated(true);
      if (!remote.ok) {
        console.error("[tasks page] hydrate:", remote.error);
        return;
      }
      setTasks(remote.tasks);
      setSelectedTaskId(remote.selectedTaskId);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || authUserId) return;
    persistTasksToLocalStorage(tasks);
  }, [tasks, hydrated, authUserId]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated || authUserId) return;
    if (selectedTaskId) localStorage.setItem(SELECTED_TASK_LOCAL_STORAGE_KEY, selectedTaskId);
    else localStorage.removeItem(SELECTED_TASK_LOCAL_STORAGE_KEY);
  }, [selectedTaskId, hydrated, authUserId]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    localStorage.setItem(SHOW_COMPLETED_KEY, String(showCompletedTasks));
  }, [showCompletedTasks, hydrated]);

  useEffect(() => {
    if (!hydrated || !authUserId) return;
    void persistSelectedTaskIdToSupabase(authUserId, selectedTaskId);
  }, [selectedTaskId, authUserId, hydrated]);

  const addTask = useCallback(async () => {
    const title = input.trim();
    if (!title) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      actualPomodoros: 0,
    };
    if (authUserId) {
      const ok = await insertTaskToSupabase(authUserId, newTask);
      if (!ok) return;
    }
    setTasks((prev) => {
      const next = [...prev, newTask];
      if (!authUserId) persistTasksToLocalStorage(next);
      return next;
    });
    setInput("");
  }, [authUserId, input]);

  const toggleTask = useCallback(
    async (id: string) => {
      const t = tasks.find((x) => x.id === id);
      if (!t) return;
      const updated: Task = { ...t, completed: !t.completed };
      if (authUserId) {
        const ok = await updateTaskInSupabase(updated);
        if (!ok) return;
        setTasks((prev) => prev.map((x) => (x.id === id ? updated : x)));
        return;
      }
      setTasks((prev) => {
        const next = prev.map((x) => (x.id === id ? updated : x));
        persistTasksToLocalStorage(next);
        return next;
      });
    },
    [authUserId, tasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (authUserId) {
        const ok = await deleteTaskFromSupabase(id);
        if (!ok) return;
        if (selectedTaskId === id) {
          void persistSelectedTaskIdToSupabase(authUserId, null);
          setSelectedTaskId(null);
        }
      } else {
        setSelectedTaskId((prev) => (prev === id ? null : prev));
      }
      setTasks((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (!authUserId) persistTasksToLocalStorage(next);
        return next;
      });
    },
    [authUserId, selectedTaskId]
  );

  const unfinishedTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <main className="min-h-dvh bg-[#0b0f14] text-white px-4 py-8 pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="text-sm text-white/50 hover:text-white/85 underline decoration-white/25 underline-offset-4"
        >
          ← ホーム
        </Link>
        <h1 className="mt-6 text-xl font-semibold tracking-tight">タスク</h1>
        <p className="mt-2 text-xs text-white/45 leading-relaxed">
          タイマーで集中するタスクを選びます。ホームに戻るとそのまま反映されます。
        </p>

        <div className="mt-8 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addTask()}
            placeholder="タイトルを入力"
            disabled={Boolean(authUserId && tasksRemoteLoading)}
            className="flex-1 px-3 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm placeholder:text-white/35 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void addTask()}
            disabled={Boolean(authUserId && tasksRemoteLoading)}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-white/20 text-sm font-medium hover:bg-white/30 disabled:opacity-50"
          >
            追加
          </button>
        </div>

        <ul className="mt-6 space-y-2">
          {authUserId && tasksRemoteLoading ? (
            <li className="py-12 text-center text-sm text-white/45">読み込み中…</li>
          ) : (
            <>
              {unfinishedTasks.length === 0 && (
                <li className="py-10 text-center text-sm text-white/40">タスクがありません</li>
              )}
              {unfinishedTasks.map((task) => (
                <li key={task.id}>
                  <div
                    className={`flex items-center gap-2 rounded-xl px-3 py-3 ${
                      selectedTaskId === task.id ? "bg-white/12 ring-1 ring-white/25" : "bg-white/[0.06]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => void toggleTask(task.id)}
                      className="rounded border-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className="min-w-0 flex-1 text-left text-sm"
                    >
                      <span className="block truncate text-white/90">{task.title}</span>
                      <span className="mt-0.5 block text-[11px] text-white/40 tabular-nums">
                        {task.actualPomodoros} ポモ
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteTask(task.id)}
                      className="shrink-0 text-xs text-white/40 hover:text-red-400/90 px-2 py-1"
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </>
          )}
        </ul>

        {!tasksRemoteLoading && completedTasks.length > 0 && (
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
              className="text-sm text-white/45 hover:text-white/70"
            >
              {showCompletedTasks ? "▼" : "▶"} 完了済み ({completedTasks.length})
            </button>
            {showCompletedTasks && (
              <ul className="mt-3 space-y-2">
                {completedTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-sm text-white/45"
                  >
                    <input
                      type="checkbox"
                      checked
                      onChange={() => void toggleTask(task.id)}
                      className="rounded border-white/25"
                    />
                    <span className="flex-1 truncate line-through">{task.title}</span>
                    <button
                      type="button"
                      onClick={() => void deleteTask(task.id)}
                      className="text-xs text-red-400/70"
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
