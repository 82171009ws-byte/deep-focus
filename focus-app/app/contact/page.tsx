import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

const CONTACT_EMAIL = "deepfocus.app.jp@gmail.com";

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

      <section className="rounded-xl border border-white/10 bg-white/5 p-5 md:p-6">
        <h2 className="text-base font-semibold text-white">メール</h2>
        <p className="mt-3 text-white/80">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Deep%20Focus%20お問い合わせ`}
            className="break-all text-emerald-400/95 underline underline-offset-4 hover:text-emerald-300"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">返信について</h2>
        <p>
          内容により、数日をいただく場合があります。自動返信メールをお送りしないこともあります。あらかじめご了承ください。
        </p>
      </section>
    </LegalPageShell>
  );
}
