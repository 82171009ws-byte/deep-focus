"use client";

import { capturePremiumClick } from "@/lib/posthog";

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
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-upsell-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-5 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="premium-upsell-title" className="text-base font-semibold leading-snug">
          Premiumで集中環境を強化
        </h2>
        <ul className="mt-4 space-y-2.5 text-sm text-white/85 leading-relaxed">
          <li className="flex gap-2">
            <span className="text-emerald-400/90 shrink-0" aria-hidden>
              ✓
            </span>
            <span>全テーマ解放</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400/90 shrink-0" aria-hidden>
              ✓
            </span>
            <span>ノイズ2つ同時再生</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400/90 shrink-0" aria-hidden>
              ✓
            </span>
            <span>プレミアムノイズ</span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400/90 shrink-0" aria-hidden>
              ✓
            </span>
            <span>詳細レポート</span>
          </li>
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
            {checkoutLoading ? "処理中…" : "Premiumを始める"}
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 text-sm font-medium text-white/90 hover:bg-white/15"
            onClick={onClose}
          >
            あとで
          </button>
        </div>
      </div>
    </div>
  );
}
