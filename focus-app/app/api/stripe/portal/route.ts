import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getOrigin, getSupabaseUserIdFromRequest } from "@/lib/apiServerHelpers";

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Stripe Customer Portal セッションを作成（解約・支払い方法など）。
 * user_profiles.stripe_customer_id が必須（Checkout / Webhook で設定）。
 */
export async function POST(req: Request) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY が設定されていません" },
        { status: 500 }
      );
    }

    const supabaseUserId = await getSupabaseUserIdFromRequest(req);
    if (!supabaseUserId) {
      return NextResponse.json(
        { error: "プラン管理にはログインが必要です。ログインしてから再度お試しください。" },
        { status: 401 }
      );
    }

    const admin = createSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "サーバー設定が不足しています（Supabase）" },
        { status: 500 }
      );
    }

    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", supabaseUserId)
      .maybeSingle();

    if (profileError) {
      console.error("[stripe portal]", profileError.message);
      return NextResponse.json(
        { error: "プロフィールの取得に失敗しました" },
        { status: 500 }
      );
    }

    const customerId = profile?.stripe_customer_id?.trim();
    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "課金情報がまだ連携されていません。決済完了から数分経ってから再度お試しください。問題が続く場合はサポートへお問い合わせください。",
        },
        { status: 400 }
      );
    }

    const stripe = new Stripe(secret);
    const origin = getOrigin(req);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "プラン管理画面の URL を取得できませんでした" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe portal]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "プラン管理の開始に失敗しました" },
      { status: 500 }
    );
  }
}
