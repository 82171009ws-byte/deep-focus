"use client";

import { useEffect } from "react";
import {
  capturePremiumClick,
  captureUpsellDismiss,
  captureUpsellModalOpen,
} from "@/lib/posthog";

const PREMIUM_BENEFITS = [
  "全テーマ解放",
  "自然音2つ同時再生",
  "プレミアム自然音",
  "詳細レポート",
] as const;

export type PremiumUpsellModalProps = {
  open: boolean;
  onClose: () => void;
  /** Premiumを始める */
  onStartPremium: () => void | Promise<void>;
  checkoutLoading?: boolean;
  checkoutError?: string | null;
};

export function PremiumUpsellModal({
  open,
  onClose,
  onStartPremium,
  checkoutLoading = false,
  checkoutError = null,
}: PremiumUpsellModalProps) {
  useEffect(() => {
    if (open) captureUpsellModalOpen();
  }, [open]);

  const handleDismiss = () => {
    captureUpsellDismiss();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-upsell-title"
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-5 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="premium-upsell-title" className="text-base font-semibold leading-snug">
          Premiumで集中環境を強化
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/75">
          25分がしんどい日でも、まず10分から。自分に合う音と記録で、集中を続けやすくします。
        </p>
        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-center">
          <p className="text-lg font-semibold tabular-nums text-white">月額490円（税込）</p>
          <p className="mt-0.5 text-xs text-white/60">1日あたり約16円</p>
        </div>
        <ul className="mt-4 space-y-2.5 text-sm text-white/85 leading-relaxed">
          {PREMIUM_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <span className="text-emerald-400/90 shrink-0" aria-hidden>
                ✓
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        {checkoutError ? (
          <p
            className="mt-4 rounded-lg border border-red-500/25 bg-red-500/15 px-2 py-1.5 text-center text-xs leading-snug text-red-300/95"
            role="alert"
          >
            {checkoutError}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={checkoutLoading}
            className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-white/90 disabled:pointer-events-none disabled:opacity-60"
            onClick={() => {
              capturePremiumClick();
              void onStartPremium();
            }}
          >
            {checkoutLoading ? "処理中…" : "月490円で集中環境を整える"}
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 text-sm font-medium text-white/90 hover:bg-white/15"
            onClick={handleDismiss}
          >
            あとで
          </button>
        </div>
      </div>
    </div>
  );
}
