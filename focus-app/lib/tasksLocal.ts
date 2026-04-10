/**
 * タスク（localStorage）。将来 Supabase へ移行しやすいようフィールド名を揃える。
 */

export const TASKS_STORAGE_KEY = "focus-tasks";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  actualPomodoros: number;
};

type LegacyRow = {
  id?: unknown;
  title?: unknown;
  text?: unknown;
  completed?: unknown;
  actualPomodoros?: unknown;
};

function normalizeTitle(row: LegacyRow): string {
  if (typeof row.title === "string" && row.title.trim()) return row.title.trim();
  if (typeof row.text === "string" && row.text.trim()) return row.text.trim();
  return "";
}

export function loadTasksFromLocalStorage(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];

    let needsPersist = false;
    const tasks: Task[] = [];

    for (const row of list) {
      const r = row as LegacyRow;
      const title = normalizeTitle(r);
      if (!title) continue;

      let id: string;
      if (typeof r.id === "string" && r.id.trim()) {
        id = r.id.trim();
      } else {
        id = crypto.randomUUID();
        needsPersist = true;
      }

      const completed = Boolean(r.completed);
      const ap = r.actualPomodoros;
      const actualPomodoros =
        typeof ap === "number" && Number.isFinite(ap) ? Math.max(0, Math.floor(ap)) : 0;

      tasks.push({ id, title, completed, actualPomodoros });
    }

    if (needsPersist) {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    }

    return tasks;
  } catch {
    return [];
  }
}

export function persistTasksToLocalStorage(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}
