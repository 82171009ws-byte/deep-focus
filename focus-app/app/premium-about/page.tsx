import Link from "next/link";

export default function PremiumAboutPage() {
  return (
    <main className="min-h-dvh bg-[#0b0f14] text-white px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white/90 underline decoration-white/30 underline-offset-4"
          >
            ← トップに戻る
          </Link>
          <h1 className="mt-4 text-xl font-semibold">プレミアムについて</h1>
        </div>

        <div className="space-y-4 text-sm text-white/80 leading-relaxed">
          <p>
            プレミアムでは、追加の環境音・集中トーンや、2つの音を同時にかけられるミックスなど、集中の幅が広がります。
          </p>
          <p>
            アプリ内の案内から購入手続きができます。ログインしたアカウントに紐づいて有効になります。
          </p>
          <p className="text-white/55 text-xs">
            請求やプラン変更は、今後 Stripe Customer Portal から行える予定です。
          </p>
        </div>
      </div>
    </main>
  );
}
