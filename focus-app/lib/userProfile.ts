import { supabase } from "@/lib/supabaseClient";

export const PREMIUM_LOCAL_STORAGE_KEY = "isPremiumUser";

const TABLE = "user_profiles";

export type UserProfileRow = {
  id: string;
  is_premium: boolean;
  stripe_customer_id: string | null;
  updated_at: string;
};

export function readLocalPremium(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PREMIUM_LOCAL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeLocalPremium(isPremium: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (isPremium) localStorage.setItem(PREMIUM_LOCAL_STORAGE_KEY, "true");
    else localStorage.removeItem(PREMIUM_LOCAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** ログイン中: Supabase の is_premium。エラー時は false。 */
export async function fetchUserPremium(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("is_premium")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[userProfile] fetchUserPremium:", error.message);
    return false;
  }
  return data?.is_premium ?? false;
}

/** ログイン中のフラグ更新（Checkout 成功ページ・解除ボタン等）。 */
export async function upsertUserPremium(userId: string, isPremium: boolean): Promise<boolean> {
  const { error } = await supabase.from(TABLE).upsert(
    { id: userId, is_premium: isPremium },
    { onConflict: "id" }
  );
  if (error) {
    console.warn("[userProfile] upsertUserPremium:", error.message);
    return false;
  }
  return true;
}
