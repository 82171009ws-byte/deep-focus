import { supabase } from "@/lib/supabaseClient";

/** 旧クライアントのみが参照していたキー。premium 判定には使わない。 */
export const PREMIUM_LOCAL_STORAGE_KEY = "isPremiumUser";

const TABLE = "user_profiles";

export type UserProfileRow = {
  id: string;
  is_premium: boolean;
  stripe_customer_id: string | null;
  selected_noise?: string;
  selected_noise2?: string;
  noise_volume?: number;
  updated_at: string;
};

export type UserNoisePrefs = {
  selectedNoise: string;
  selectedNoise2: string;
  noiseVolume: number;
};

/** 端末に残った旧フラグを削除（ログアウト時など）。premium の source of truth は DB のみ。 */
export function clearPremiumLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREMIUM_LOCAL_STORAGE_KEY);
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

/** ログイン中: Supabase のノイズ設定。未設定時はデフォルト。 */
export async function fetchUserNoisePrefs(userId: string): Promise<UserNoisePrefs> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("selected_noise, selected_noise2, noise_volume")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[userProfile] fetchUserNoisePrefs:", error.message);
    return { selectedNoise: "none", selectedNoise2: "none", noiseVolume: 70 };
  }

  return {
    selectedNoise: (data?.selected_noise as string | undefined) ?? "none",
    selectedNoise2: (data?.selected_noise2 as string | undefined) ?? "none",
    noiseVolume:
      typeof data?.noise_volume === "number" && data.noise_volume >= 0 && data.noise_volume <= 100
        ? data.noise_volume
        : 70,
  };
}

/** ログイン中: ノイズ設定を保存（user_profiles に upsert）。 */
export async function upsertUserNoisePrefs(userId: string, prefs: UserNoisePrefs): Promise<boolean> {
  const { error } = await supabase.from(TABLE).upsert(
    {
      id: userId,
      selected_noise: prefs.selectedNoise,
      selected_noise2: prefs.selectedNoise2,
      noise_volume: prefs.noiseVolume,
    },
    { onConflict: "id" }
  );
  if (error) {
    console.warn("[userProfile] upsertUserNoisePrefs:", error.message);
    return false;
  }
  return true;
}
