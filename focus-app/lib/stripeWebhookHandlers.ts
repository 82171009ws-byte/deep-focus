import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * checkout.session.completed（サブスク完了）
 * metadata.supabase_user_id と Stripe Customer を user_profiles に反映する。
 */
export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription") return;

  const userId = session.metadata?.supabase_user_id?.trim();
  if (!userId) {
    console.warn("[stripe webhook] checkout.session.completed: missing metadata.supabase_user_id");
    return;
  }

  const customerRaw = session.customer;
  const customerId = typeof customerRaw === "string" ? customerRaw : customerRaw?.id;
  if (!customerId) {
    console.warn("[stripe webhook] checkout.session.completed: missing customer");
    return;
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    console.error("[stripe webhook] SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not set");
    throw new Error("Supabase admin client is not configured");
  }

  const { error } = await admin.from("user_profiles").upsert(
    { id: userId, is_premium: true, stripe_customer_id: customerId },
    { onConflict: "id" }
  );
  if (error) {
    console.error("[stripe webhook] user_profiles upsert:", error.message);
    throw error;
  }
}

/**
 * 解約確定時: stripe_customer_id でユーザーを特定し is_premium を false に戻す（将来用）
 */
export async function handleCustomerSubscriptionDeleted(_subscription: Stripe.Subscription): Promise<void> {
  // TODO: subscription.customer → user_profiles.stripe_customer_id で UPDATE
  // 複数サブスクや Customer 共有がある場合は subscription id の保存が必要
}

/**
 * 支払い失敗時: アクセス制限や通知（将来用）
 */
export async function handleInvoicePaymentFailed(_invoice: Stripe.Invoice): Promise<void> {
  // TODO: invoice.customer → 方針に応じて is_premium を落とす / 猶予期間を設ける 等
}
