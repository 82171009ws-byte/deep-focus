import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * リダイレクト先のオリジン（本番は NEXT_PUBLIC_APP_URL 推奨）
 */
function getOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * Stripe Checkout（サブスクリプション）セッションを作成。
 * クライアントは秘密鍵を持たず、この API のみ経由。
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

    const stripe = new Stripe(secret);
    const origin = getOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
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
