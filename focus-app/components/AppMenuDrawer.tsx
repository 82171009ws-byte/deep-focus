"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const PANEL_MS = 320;

export type AppMenuDrawerProps = {
  open: boolean;
  onClose: () => void;
  onOpenTasks: () => void;
  onOpenSettings: () => void;
  onOpenPremium: () => void;
  showPlanManagement?: boolean;
  onOpenPlanManagement?: () => void;
  planManagementLoading?: boolean;
  planManagementError?: string | null;
  /** ログイン中のみ true（サイドバー最下部にログアウトを出す） */
  showLogout?: boolean;
  onLogout?: () => void | Promise<void>;
  logoutLoading?: boolean;
};

export function AppMenuDrawer({
  open,
  onClose,
  onOpenTasks,
  onOpenSettings,
  onOpenPremium,
  showPlanManagement = false,
  onOpenPlanManagement,
  planManagementLoading = false,
  planManagementError = null,
  showLogout = false,
  onLogout,
  logoutLoading = false,
}: AppMenuDrawerProps) {
  const [present, setPresent] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      setPresent(true);
      setEntered(false);
    } else {
      setEntered(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !present) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setEntered(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, present]);

  useEffect(() => {
    if (!open && present) {
      const t = window.setTimeout(() => setPresent(false), PANEL_MS);
      return () => window.clearTimeout(t);
    }
  }, [open, present]);

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, onClose]);

  useEffect(() => {
    if (!present) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [present]);

  const goTasks = useCallback(() => {
    onClose();
    onOpenTasks();
  }, [onClose, onOpenTasks]);

  const goSettings = useCallback(() => {
    onClose();
    onOpenSettings();
  }, [onClose, onOpenSettings]);

  const goPremium = useCallback(() => {
    onClose();
    onOpenPremium();
  }, [onClose, onOpenPremium]);

  const goPlanManagement = useCallback(() => {
    onOpenPlanManagement?.();
  }, [onOpenPlanManagement]);

  if (!present) return null;

  const itemClass =
    "block w-full px-3 py-2.5 rounded-lg text-sm text-white/90 hover:bg-white/10 transition text-left duration-200 ease-out";

  return (
    <div
      className="fixed inset-0 z-[200] flex pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="メニュー"
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/60 backdrop-blur-[3px] transition-opacity duration-[320ms] ease-in-out ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-label="メニューを閉じる"
      />

      <aside
        className={`relative h-full w-[min(280px,calc(100vw-24px))] shrink-0 flex flex-col bg-[#0c1016]/95 border-r border-white/10 shadow-2xl backdrop-blur-md transition-transform duration-[320ms] ease-in-out ${
          entered ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 shrink-0">
          <span className="text-xs font-semibold tracking-wide text-white/50">メニュー</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white text-lg leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-0.5">
          <Link href="/" onClick={onClose} className={itemClass}>
            ホーム
          </Link>
          <button type="button" onClick={goTasks} className={itemClass}>
            タスク
          </button>
          <Link href="/report" onClick={onClose} className={itemClass}>
            レポート
          </Link>
          <button type="button" onClick={goSettings} className={itemClass}>
            設定
          </button>
          <button type="button" onClick={goPremium} className={itemClass}>
            プレミアム
          </button>
          {showPlanManagement && (
            <>
              <button
                type="button"
                onClick={goPlanManagement}
                disabled={planManagementLoading}
                className={`${itemClass} disabled:opacity-50 disabled:pointer-events-none`}
              >
                {planManagementLoading ? "プラン管理を開いています…" : "プラン管理"}
              </button>
              {planManagementError && (
                <p
                  className="mt-1 px-3 py-2 rounded-lg text-xs text-red-300/95 bg-red-500/15 border border-red-500/25 leading-snug"
                  role="alert"
                >
                  {planManagementError}
                </p>
              )}
            </>
          )}
        </nav>

        {showLogout && onLogout && (
          <div className="shrink-0 border-t border-white/10 px-3 py-3">
            <button
              type="button"
              onClick={() => void onLogout()}
              disabled={logoutLoading}
              className={`${itemClass} text-white/70 hover:text-white hover:bg-white/10 border border-white/15`}
            >
              {logoutLoading ? "ログアウト中…" : "ログアウト"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
