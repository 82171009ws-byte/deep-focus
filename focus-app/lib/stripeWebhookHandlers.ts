import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type StripeClient = InstanceType<typeof Stripe>;

/** アプリ上のプレミアム可否（Stripe の status に対応） */
function isPremiumFromSubscriptionStatus(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing";
}

function subscriptionPrimaryPriceId(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  const price = item?.price;
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}

function customerIdFromStripe(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/**
 * subscription / customer から Supabase user id を解決する。
 * 1) subscription.metadata.supabase_user_id
 * 2) user_profiles.stripe_customer_id による逆引き
 */
async function resolveUserIdForSubscription(
  admin: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<string | null> {
  const fromMeta = subscription.metadata?.supabase_user_id?.trim();
  if (fromMeta) return fromMeta;

  const customerId = customerIdFromStripe(subscription.customer);
  if (!customerId) return null;

  const { data, error } = await admin
    .from("user_profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("[stripe webhook] resolve user by customer:", error.message);
    return null;
  }
  return data?.id ?? null;
}

async function upsertProfileFromSubscription(
  admin: SupabaseClient,
  userId: string,
  customerId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const status = subscription.status;
  const priceId = subscriptionPrimaryPriceId(subscription);
  const isPremium = isPremiumFromSubscriptionStatus(status);

  const { error } = await admin.from("user_profiles").upsert(
    {
      id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      price_id: priceId,
      is_premium: isPremium,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[stripe webhook] user_profiles upsert:", error.message);
    throw error;
  }
}

/**
 * checkout.session.completed（サブスク）
 * Session の metadata と Subscription を突き合わせ、user_profiles を更新する。
 */
export async function handleCheckoutSessionCompleted(
  stripe: StripeClient,
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.mode !== "subscription") return;

  const userId = session.metadata?.supabase_user_id?.trim();
  if (!userId) {
    console.warn("[stripe webhook] checkout.session.completed: missing metadata.supabase_user_id");
    return;
  }

  const subRef = session.subscription;
  const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id;
  if (!subscriptionId) {
    console.warn("[stripe webhook] checkout.session.completed: missing subscription id");
    return;
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    console.error("[stripe webhook] Supabase admin client is not configured");
    throw new Error("Supabase admin client is not configured");
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = customerIdFromStripe(subscription.customer);
  if (!customerId) {
    console.warn("[stripe webhook] checkout.session.completed: missing customer on subscription");
    return;
  }

  await upsertProfileFromSubscription(admin, userId, customerId, subscription);
}

/** customer.subscription.updated */
export async function handleCustomerSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    console.error("[stripe webhook] Supabase admin client is not configured");
    throw new Error("Supabase admin client is not configured");
  }

  const userId = await resolveUserIdForSubscription(admin, subscription);
  if (!userId) {
    console.warn("[stripe webhook] customer.subscription.updated: could not resolve user id", subscription.id);
    return;
  }

  const customerId = customerIdFromStripe(subscription.customer);
  if (!customerId) {
    console.warn("[stripe webhook] customer.subscription.updated: missing customer", subscription.id);
    return;
  }

  await upsertProfileFromSubscription(admin, userId, customerId, subscription);
}

/** customer.subscription.deleted */
export async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    console.error("[stripe webhook] Supabase admin client is not configured");
    throw new Error("Supabase admin client is not configured");
  }

  const userId = await resolveUserIdForSubscription(admin, subscription);
  if (!userId) {
    console.warn("[stripe webhook] customer.subscription.deleted: could not resolve user id", subscription.id);
    return;
  }

  const { error } = await admin
    .from("user_profiles")
    .update({
      is_premium: false,
      subscription_status: subscription.status,
      stripe_subscription_id: null,
      price_id: null,
    })
    .eq("id", userId);

  if (error) {
    console.error("[stripe webhook] user_profiles update on delete:", error.message);
    throw error;
  }
}
