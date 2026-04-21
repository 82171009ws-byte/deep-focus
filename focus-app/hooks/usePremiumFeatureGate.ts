"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export type PremiumFeatureGateParams = {
  authUserId: string | null;
  /** Supabase user_profiles.is_premium（未ログイン時は false） */
  isPremiumUser: boolean;
  /** ログイン済み・未課金のときに呼ぶ（例: 案内モーダルを開く） */
  onNeedPremium: () => void;
};

/**
 * 未ログイン → /login、ログイン済み未課金 → onNeedPremium、課金済み → onAllowed。
 * アプリ全体で同一の分岐を使うための単一ソース。
 */
export function usePremiumFeatureGate({
  authUserId,
  isPremiumUser,
  onNeedPremium,
}: PremiumFeatureGateParams) {
  const router = useRouter();

  return useCallback(
    (onAllowed: () => void) => {
      if (!authUserId) {
        router.push("/login");
        return;
      }
      if (!isPremiumUser) {
        onNeedPremium();
        return;
      }
      onAllowed();
    },
    [authUserId, isPremiumUser, router, onNeedPremium]
  );
}
