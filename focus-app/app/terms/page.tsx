import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "利用規約 | Deep Focus",
  description: "Deep Focus の利用規約です。",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="利用規約">
      <p className="text-white/60 text-xs">
        本規約の変更にあたり、本ページを更新します。重要な変更の際は、合理的な周知の方法にてお知らせする場合があります。
      </p>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">第1条（適用）</h2>
        <p>
          本規約は、本サービス「Deep Focus」（以下「本サービス」）の利用条件を定めるものです。利用者は本規約に同意のうえ本サービスを利用するものとします。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">第2条（アカウント）</h2>
        <p>
          ログイン機能を利用する場合、利用者は正確な情報を登録し、自己の責任においてアカウントを管理します。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">第3条（禁止事項）</h2>
        <p>
          法令違反、第三者の権利侵害、過度な負荷をかける行為、その他運営が不適切と判断する行為を禁止します。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">第4条（免責・準拠法）</h2>
        <p>
          本サービスは現状有姿で提供されます。本規約の準拠法は日本国法とし、本サービスに関し紛争が生じた場合は、運営者所在地を管轄とする地方裁判所を専属的合意管轄とします。
        </p>
      </section>
    </LegalPageShell>
  );
}
