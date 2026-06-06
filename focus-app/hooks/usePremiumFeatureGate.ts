"use client";

import { useCallback } from "react";

export type PremiumFeatureGateParams = {
  authUserId: string | null;
  /** Supabase user_profiles.is_premium（未ログイン時は false） */
  isPremiumUser: boolean;
  /** ログイン済み・未課金のときに呼ぶ（例: 案内モーダルを開く） */
  onNeedPremium: () => void;
};

/**
 * 未ログイン / 未課金 → onNeedPremium（説明モーダル）、課金済み → onAllowed。
 * ログイン誘導はモーダル内の「Premiumを始める」押下時に行う。
 */
export function usePremiumFeatureGate({
  authUserId,
  isPremiumUser,
  onNeedPremium,
}: PremiumFeatureGateParams) {
  return useCallback(
    (onAllowed: () => void) => {
      if (!authUserId || !isPremiumUser) {
        onNeedPremium();
        return;
      }
      onAllowed();
    },
    [authUserId, isPremiumUser, onNeedPremium]
  );
}
