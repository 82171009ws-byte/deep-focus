import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "利用規約 | Deep Focus",
  description: "Deep Focus の利用規約（簡易版・仮置き）です。",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="利用規約">
      <p className="text-white/55 text-xs">
        以下は簡易版の仮テキストです。正式な条項は法務確認のうえ差し替えてください。
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
          本サービスは現状有姿で提供されます。紛争が生じた場合の準拠法および管轄裁判所は、別途定めるところによるか、運営者所在地を管轄する裁判所とします（要差し替え）。
        </p>
      </section>
    </LegalPageShell>
  );
}
