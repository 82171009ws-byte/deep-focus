import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Deep Focus",
  description: "Deep Focus のプライバシーポリシーです。",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="プライバシーポリシー">
      <p className="text-white/60 text-xs">
        本ポリシーは、個人情報の取扱いを定めます。改定の際は、本ページに掲出します。
      </p>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">1. 取得する情報</h2>
        <p>
          アカウント登録時にメールアドレス等を取得する場合があります。また、サービス改善のためアクセスログや利用状況を取得することがあります。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">2. 利用目的</h2>
        <p>
          本人確認、サービス提供・維持、お問い合わせ対応、不正利用の防止、法令遵守のために利用します。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">3. 第三者への提供</h2>
        <p>
          法令に基づく場合を除き、本人の同意なく第三者に個人情報を提供しません。決済には Stripe 等の外部サービスを利用する場合があり、そのプライバシーポリシーが適用されます。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">4. お問い合わせ</h2>
        <p>
          個人情報の開示・訂正・削除等のご請求は、
          <Link
            href="/contact"
            className="text-emerald-400/90 underline underline-offset-4 hover:text-emerald-300"
          >
            お問い合わせページ
          </Link>
          からご連絡ください。
        </p>
      </section>
    </LegalPageShell>
  );
}
