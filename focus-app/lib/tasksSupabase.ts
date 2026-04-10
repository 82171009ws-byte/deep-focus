/**
 * ログイン中のタスク永続化（Supabase user_tasks + user_profiles.selected_task_id）。
 * 未ログイン時は lib/tasksLocal を使う。
 */

import { supabase } from "@/lib/supabaseClient";
import type { Task } from "@/lib/tasksLocal";

const TASKS_TABLE = "user_tasks";
const PROFILES_TABLE = "user_profiles";

/** page.tsx STORAGE_KEYS.selectedTask と同一（tasksLocal は変更しない） */
export const SELECTED_TASK_LOCAL_STORAGE_KEY = "focus-selected-task";

export function localTasksMigrationStorageKey(userId: string): string {
  return `focus-tasks-migrated:${userId}`;
}

export function isLocalTasksMigrationDone(userId: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(localTasksMigrationStorageKey(userId)) === "true";
}

export function markLocalTasksMigrationDone(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(localTasksMigrationStorageKey(userId), "true");
}

export function readLocalStorageSelectedTaskId(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(SELECTED_TASK_LOCAL_STORAGE_KEY);
  return v && v.trim() ? v.trim() : null;
}

type DbTaskRow = {
  id: string;
  title: string;
  completed: boolean;
  actual_pomodoros: number;
};

function rowToTask(row: DbTaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    actualPomodoros: Math.max(0, Math.floor(Number(row.actual_pomodoros) || 0)),
  };
}

export async function fetchTasksFromSupabaseResult(): Promise<
  { ok: true; tasks: Task[] } | { ok: false; error: Error }
> {
  const { data, error } = await supabase
    .from(TASKS_TABLE)
    .select("id, title, completed, actual_pomodoros")
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: new Error(error.message) };
  }

  return { ok: true, tasks: (data ?? []).map((r) => rowToTask(r as DbTaskRow)) };
}

/** 互換用: エラー時は [] と warn */
export async function fetchTasksFromSupabase(): Promise<Task[]> {
  const r = await fetchTasksFromSupabaseResult();
  if (!r.ok) {
    console.warn("[tasksSupabase] fetchTasks:", r.error.message);
    return [];
  }
  return r.tasks;
}

export async function insertTasksBatchToSupabase(
  userId: string,
  tasks: Task[]
): Promise<{ ok: true } | { ok: false; error: Error }> {
  if (tasks.length === 0) return { ok: true };
  const rows = tasks.map((t) => ({
    id: t.id,
    user_id: userId,
    title: t.title,
    completed: t.completed,
    actual_pomodoros: t.actualPomodoros,
  }));
  const { error } = await supabase.from(TASKS_TABLE).insert(rows);
  if (error) {
    return { ok: false, error: new Error(error.message) };
  }
  return { ok: true };
}

export async function insertTaskToSupabase(userId: string, task: Task): Promise<boolean> {
  const { error } = await supabase.from(TASKS_TABLE).insert({
    id: task.id,
    user_id: userId,
    title: task.title,
    completed: task.completed,
    actual_pomodoros: task.actualPomodoros,
  });

  if (error) {
    console.error("[tasksSupabase] insertTask:", error.message);
    return false;
  }
  return true;
}

export async function updateTaskInSupabase(task: Task): Promise<boolean> {
  const { error } = await supabase
    .from(TASKS_TABLE)
    .update({
      title: task.title,
      completed: task.completed,
      actual_pomodoros: task.actualPomodoros,
    })
    .eq("id", task.id);

  if (error) {
    console.error("[tasksSupabase] updateTask:", error.message);
    return false;
  }
  return true;
}

export async function deleteTaskFromSupabase(taskId: string): Promise<boolean> {
  const { error } = await supabase.from(TASKS_TABLE).delete().eq("id", taskId);

  if (error) {
    console.error("[tasksSupabase] deleteTask:", error.message);
    return false;
  }
  return true;
}

export async function fetchSelectedTaskIdFromSupabaseResult(
  userId: string
): Promise<{ ok: true; selectedTaskId: string | null } | { ok: false; error: Error }> {
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("selected_task_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: new Error(error.message) };
  }

  const raw = data?.selected_task_id;
  const selectedTaskId = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  return { ok: true, selectedTaskId };
}

export async function fetchSelectedTaskIdFromSupabase(userId: string): Promise<string | null> {
  const r = await fetchSelectedTaskIdFromSupabaseResult(userId);
  if (!r.ok) {
    console.warn("[tasksSupabase] fetchSelectedTaskId:", r.error.message);
    return null;
  }
  return r.selectedTaskId;
}

export async function persistSelectedTaskIdToSupabase(
  userId: string,
  taskId: string | null
): Promise<boolean> {
  const { error } = await supabase
    .from(PROFILES_TABLE)
    .update({ selected_task_id: taskId })
    .eq("id", userId);

  if (error) {
    console.error("[tasksSupabase] persistSelectedTaskId:", error.message);
    return false;
  }
  return true;
}
