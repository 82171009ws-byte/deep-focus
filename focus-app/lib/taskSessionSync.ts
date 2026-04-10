/**
 * タスクのセッション同期（local / remote の切り替え・初回移行・選択整合）。
 * Supabase I/O は lib/tasksSupabase に委譲する。
 */

import { loadTasksFromLocalStorage, type Task } from "@/lib/tasksLocal";
import {
  fetchSelectedTaskIdFromSupabaseResult,
  fetchTasksFromSupabaseResult,
  insertTasksBatchToSupabase,
  isLocalTasksMigrationDone,
  markLocalTasksMigrationDone,
  persistSelectedTaskIdToSupabase,
  readLocalStorageSelectedTaskId,
} from "@/lib/tasksSupabase";

export type SessionLike = { user?: { id?: string } } | null;

export function hydrateLocalTasks(): { tasks: Task[]; selectedTaskId: string | null } {
  return {
    tasks: loadTasksFromLocalStorage(),
    selectedTaskId: readLocalStorageSelectedTaskId(),
  };
}

/**
 * プロフィール上の選択 ID を tasks 一覧に照合し、孤児なら null に揃える。
 */
export function syncSelectedTask(
  _session: SessionLike,
  tasks: Task[],
  profileSelectedTaskId: string | null
): { selectedTaskId: string | null; shouldPersistNullToProfile: boolean } {
  const raw = profileSelectedTaskId?.trim() || null;
  if (raw && tasks.some((t) => t.id === raw)) {
    return { selectedTaskId: raw, shouldPersistNullToProfile: false };
  }
  return {
    selectedTaskId: null,
    shouldPersistNullToProfile: raw != null,
  };
}

/**
 * 初回のみ: remote が空 & local にタスクあり & 未マイグレーションなら user_tasks へコピー。
 */
export async function migrateLocalTasksIfNeeded(
  session: SessionLike
): Promise<{ ok: true; migrated: boolean } | { ok: false; error: Error }> {
  const uid = session?.user?.id;
  if (!uid) return { ok: true, migrated: false };

  if (isLocalTasksMigrationDone(uid)) {
    return { ok: true, migrated: false };
  }

  const remote = await fetchTasksFromSupabaseResult();
  if (!remote.ok) {
    return { ok: false, error: remote.error };
  }

  if (remote.tasks.length > 0) {
    return { ok: true, migrated: false };
  }

  const localTasks = loadTasksFromLocalStorage();
  if (localTasks.length === 0) {
    return { ok: true, migrated: false };
  }

  const inserted = await insertTasksBatchToSupabase(uid, localTasks);
  if (!inserted.ok) {
    return { ok: false, error: inserted.error };
  }

  const localSel = readLocalStorageSelectedTaskId();
  if (localSel && localTasks.some((t) => t.id === localSel)) {
    const ok = await persistSelectedTaskIdToSupabase(uid, localSel);
    if (!ok) {
      console.error("[taskSessionSync] migrate: selected_task_id の保存に失敗しました（タスクは移行済み）");
    }
  }

  markLocalTasksMigrationDone(uid);

  return { ok: true, migrated: true };
}

export async function hydrateRemoteTasks(
  session: SessionLike
): Promise<
  { ok: true; tasks: Task[]; selectedTaskId: string | null } | { ok: false; error: Error }
> {
  const uid = session?.user?.id;
  if (!uid) {
    return { ok: false, error: new Error("hydrateRemoteTasks: session user missing") };
  }

  const tasksRes = await fetchTasksFromSupabaseResult();
  if (!tasksRes.ok) {
    return { ok: false, error: tasksRes.error };
  }

  const selRes = await fetchSelectedTaskIdFromSupabaseResult(uid);
  if (!selRes.ok) {
    return { ok: false, error: selRes.error };
  }

  const synced = syncSelectedTask(session, tasksRes.tasks, selRes.selectedTaskId);
  if (synced.shouldPersistNullToProfile) {
    const ok = await persistSelectedTaskIdToSupabase(uid, null);
    if (!ok) {
      return { ok: false, error: new Error("persistSelectedTaskId (orphan cleanup) failed") };
    }
  }

  return {
    ok: true,
    tasks: tasksRes.tasks,
    selectedTaskId: synced.selectedTaskId,
  };
}
