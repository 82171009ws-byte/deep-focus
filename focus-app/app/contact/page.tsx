import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

/** 問い合わせ先は実運用のメール・URL に差し替えてください。 */
const CONTACT_EMAIL = "support@example.com";

export const metadata: Metadata = {
  title: "お問い合わせ | Deep Focus",
  description: "Deep Focus へのお問い合わせ先です。",
};

export default function ContactPage() {
  return (
    <LegalPageShell title="お問い合わせ">
      <p>
        Deep Focus に関するご質問・不具合のご報告・ビジネスに関するお問い合わせは、下記よりご連絡ください。
      </p>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <h2 className="text-base font-semibold text-white">メール</h2>
        <p className="mt-3 text-white/80">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Deep%20Focus%20お問い合わせ`}
            className="break-all text-emerald-400/95 underline underline-offset-4 hover:text-emerald-300"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="mt-3 text-xs text-white/50">
          ※ 上記は仮のアドレスです。運用開始時に実際の連絡先へ変更してください。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">返信について</h2>
        <p>
          内容により数日いただく場合があります。自動返信メールは設けていない場合があります（要差し替え）。
        </p>
      </section>
    </LegalPageShell>
  );
}
