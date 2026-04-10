import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getOrigin, getSupabaseUserIdFromRequest } from "@/lib/apiServerHelpers";

/**
 * Stripe Checkout（サブスクリプション）セッションを作成。
 * クライアントは秘密鍵を持たず、この API のみ経由。
 * Webhook で user_profiles と紐づけるため、ログイン中は metadata に supabase_user_id を付与する。
 */
export async function POST(req: Request) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!secret) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY が設定されていません" },
        { status: 500 }
      );
    }
    if (!priceId) {
      return NextResponse.json(
        { error: "STRIPE_PRICE_ID が設定されていません（ダッシュボードで月額 Price ID を作成）" },
        { status: 500 }
      );
    }

    const supabaseUserId = await getSupabaseUserIdFromRequest(req);
    if (!supabaseUserId) {
      return NextResponse.json(
        { error: "プレミアム登録にはログインが必要です。ログインしてから再度お試しください。" },
        { status: 401 }
      );
    }

    const stripe = new Stripe(secret);
    const origin = getOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      metadata: {
        supabase_user_id: supabaseUserId,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: supabaseUserId,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout URL を取得できませんでした" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[checkout]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout の作成に失敗しました" },
      { status: 500 }
    );
  }
}
