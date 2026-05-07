import { supabase } from "@/lib/supabaseClient";
import { capturePremiumClick } from "@/lib/posthog";

export type PremiumCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; needsLogin: true }
  | { ok: false; error: string };

/** Stripe Checkout の URL を取得（トークンが無いときは needsLogin） */
export async function createPremiumCheckoutSession(): Promise<PremiumCheckoutResult> {
  const { data: authData } = await supabase.auth.getSession();
  const token = authData.session?.access_token;
  if (!token) return { ok: false, needsLogin: true };

  capturePremiumClick();

  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      return { ok: false, error: data.error ?? "決済の準備に失敗しました" };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, error: "通信に失敗しました" };
  }
}
