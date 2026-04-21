import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  handleCheckoutSessionCompleted,
  handleCustomerSubscriptionDeleted,
  handleCustomerSubscriptionUpdated,
} from "@/lib/stripeWebhookHandlers";

export const runtime = "nodejs";

/** ブラウザ等での誤アクセス用。Stripe は POST のみ使用。 */
export function GET() {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: "POST" },
  });
}

/**
 * Stripe Webhook。プレミアム反映はここだけを正とする（success ページでは更新しない）。
 * 署名検証: STRIPE_WEBHOOK_SECRET
 * DB 更新: SUPABASE_SERVICE_ROLE_KEY（サーバーのみ）
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || !webhookSecret) {
    console.error("[stripe webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "サーバー設定が不足しています" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "stripe-signature がありません" }, { status: 400 });
  }

  const stripe = new Stripe(secret);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    console.error("[stripe webhook] signature verification failed:", e);
    return NextResponse.json({ error: "署名が無効です" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(stripe, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleCustomerSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] handler error:", e);
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
