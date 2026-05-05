import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getOrigin, getSupabaseUserIdFromRequest } from "@/lib/apiServerHelpers";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

function maskStripeSecret(secret: string): string {
  if (secret.length <= 10) return `${secret.slice(0, 4)}...`;
  return `${secret.slice(0, 7)}...${secret.slice(-4)}`;
}

function detectSecretMode(secret: string): "live" | "test" | "unknown" {
  if (secret.startsWith("sk_live_")) return "live";
  if (secret.startsWith("sk_test_")) return "test";
  return "unknown";
}

/**
 * Stripe Checkout（サブスクリプション）セッションを作成。
 * クライアントは秘密鍵を持たず、この API のみ経由。
 * Webhook で user_profiles と紐づけるため、ログイン中は metadata に supabase_user_id を付与する。
 */
export async function POST(req: Request) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    const mode = secret ? detectSecretMode(secret) : "unknown";

    if (!secret) {
      console.error("[checkout] missing env: STRIPE_SECRET_KEY");
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY が設定されていません" },
        { status: 500 }
      );
    }
    if (!priceId) {
      console.error("[checkout] missing env: STRIPE_PRICE_ID");
      return NextResponse.json(
        { error: "STRIPE_PRICE_ID が設定されていません（ダッシュボードで月額 Price ID を作成）" },
        { status: 500 }
      );
    }
    if (mode === "unknown") {
      return NextResponse.json(
        {
          error:
            "STRIPE_SECRET_KEY の形式が不正です。sk_live_ または sk_test_ で始まるキーを設定してください。",
        },
        { status: 500 }
      );
    }
    if (process.env.NODE_ENV === "production" && mode !== "live") {
      return NextResponse.json(
        {
          error:
            "本番環境では STRIPE_SECRET_KEY に sk_live_ を設定してください（test/live の混在を防止）。",
        },
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
    console.info("[checkout] env", {
      secretEnv: "STRIPE_SECRET_KEY",
      secretKey: maskStripeSecret(secret),
      secretMode: mode,
      priceEnv: "STRIPE_PRICE_ID",
      priceId,
      nodeEnv: process.env.NODE_ENV ?? "unknown",
    });

    // Stripe API 上で price の存在と livemode を先に確認し、test/live混在を明確化する。
    let price: Stripe.Price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError | undefined;
      const isInvalidRequest = stripeError?.type === "StripeInvalidRequestError";
      if (isInvalidRequest) {
        console.error("[checkout] failed to retrieve price", {
          envPriceVar: "STRIPE_PRICE_ID",
          priceId,
          envSecretVar: "STRIPE_SECRET_KEY",
          secretMode: mode,
          code: stripeError.code,
          message: stripeError.message,
        });
        return NextResponse.json(
          {
            error:
              "指定された STRIPE_PRICE_ID が見つかりません。STRIPE_SECRET_KEY と STRIPE_PRICE_ID の test/live が混在している可能性があります。",
          },
          { status: 500 }
        );
      }
      throw error;
    }
    const priceMode = price.livemode ? "live" : "test";
    if (priceMode !== mode) {
      console.error("[checkout] stripe mode mismatch", {
        envSecretVar: "STRIPE_SECRET_KEY",
        secretMode: mode,
        envPriceVar: "STRIPE_PRICE_ID",
        priceId,
        priceMode,
      });
      return NextResponse.json(
        {
          error:
            "Stripe 環境が不一致です。STRIPE_SECRET_KEY と STRIPE_PRICE_ID を同じ環境（live/live もしくは test/test）に揃えてください。",
        },
        { status: 500 }
      );
    }

    let existingStripeCustomerId: string | undefined;
    const admin = createSupabaseAdminClient();
    if (admin) {
      const { data: profile } = await admin
        .from("user_profiles")
        .select("stripe_customer_id")
        .eq("id", supabaseUserId)
        .maybeSingle();
      existingStripeCustomerId = profile?.stripe_customer_id?.trim() || undefined;
    }

    // subscription モードでは customer_creation は使用不可。既存 Customer があれば customer のみ指定し、
    // ない場合は Stripe が Checkout 完了時に Customer を作成する。
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
    };
    if (existingStripeCustomerId) {
      sessionParams.customer = existingStripeCustomerId;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
