import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

const LEGAL_SPEC = {
  seller: "渡邉修平",
  operator: "渡邉修平",
  address: "大阪府高槻市",
  email: "deepfocus.app.jp@gmail.com",
  serviceName: "Deep Focus",
  price: "月額490円（税込）",
  paymentTiming:
    "申込み時に、お客様が選択した決済手段に応じて随時請求されます（カード決済の場合は各カード会社の規約に準じます）。",
  deliveryTiming:
    "決済完了後、速やかにサービスが利用可能となります（ログイン・アカウント状態により異なる場合があります）。",
  cancellation:
    "Premium は所定の解約手続によりいつでも解約できます。解約後の日割り返金の有無は決済サービスまたはアプリ内の案内に従います。",
  /** フッターにそのまま表示（特定商取引法・表記まわりの注記） */
  disclosureFooter: "※請求があった場合、遅滞なく開示いたします",
} as const;

const LEGAL_ROWS: {
  label: string;
  renderValue: () => ReactNode;
}[] = [
  { label: "販売事業者", renderValue: () => LEGAL_SPEC.seller },
  { label: "運営責任者", renderValue: () => LEGAL_SPEC.operator },
  { label: "所在地", renderValue: () => LEGAL_SPEC.address },
  { label: "提供サービス名", renderValue: () => LEGAL_SPEC.serviceName },
  { label: "料金", renderValue: () => LEGAL_SPEC.price },
  { label: "支払時期", renderValue: () => LEGAL_SPEC.paymentTiming },
  { label: "提供時期", renderValue: () => LEGAL_SPEC.deliveryTiming },
  { label: "解約方法", renderValue: () => LEGAL_SPEC.cancellation },
  {
    label: "問い合わせ先",
    renderValue: () => (
      <>
        <a
          href={`mailto:${LEGAL_SPEC.email}`}
          className="font-medium text-emerald-400/95 underline decoration-emerald-500/40 underline-offset-4 hover:text-emerald-300"
        >
          {LEGAL_SPEC.email}
        </a>
        <span className="mt-3 block text-sm text-white/65">
          または{" "}
          <Link
            href="/contact"
            className="text-emerald-400/90 underline underline-offset-4 hover:text-emerald-300"
          >
            お問い合わせページ
          </Link>
        </span>
      </>
    ),
  },
];

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | Deep Focus",
  description: "Deep Focus の特定商取引法に基づく表記です。",
};

export default function LegalNoticePage() {
  return (
    <LegalPageShell title="特定商取引法に基づく表記">
      <div className="space-y-6">
        <p className="text-xs leading-relaxed text-white/55">
          インターネットを通じたサービス提供に関する表示です。内容は法令や事業実態に応じて更新することがあります。
        </p>

        <dl className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
          {LEGAL_ROWS.map((row, index) => (
            <div
              key={row.label}
              className={`grid grid-cols-1 gap-2 px-5 py-5 md:grid-cols-[minmax(140px,200px)_1fr] md:items-start md:gap-8 md:px-6 md:py-5 ${
                index !== LEGAL_ROWS.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <dt className="text-sm font-medium text-gray-400 md:pt-0.5">
                {row.label}
              </dt>
              <dd className="text-sm leading-relaxed text-white md:text-[15px]">
                {row.renderValue()}
              </dd>
            </div>
          ))}
        </dl>

        <p className="text-xs leading-relaxed text-white/50">
          {LEGAL_SPEC.disclosureFooter}
        </p>
      </div>
    </LegalPageShell>
  );
}
