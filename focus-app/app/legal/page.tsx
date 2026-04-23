import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

const LEGAL_SPEC = {
  seller: "渡邉修平",
  operator: "渡邉修平",
  address: "大阪府高槻市",
  email: "deepfocus.app.jp@gmail.com",
  serviceName: "Deep Focus",
  price: "月額490円（税込）",
  extraFees:
    "インターネット接続にかかる通信費等はお客様のご負担となります。",
  paymentMethod: "クレジットカード決済（Stripeを利用）",
  paymentTiming: "申込時に課金され、以降は毎月自動更新されます。",
  deliveryTiming: "決済完了後、直ちにご利用いただけます。",
  cancellation: [
    "アプリ内のプラン管理画面、またはStripeのカスタマーポータルよりいつでも解約可能です。",
    "次回更新日前までに解約手続きを行うことで、翌月以降の課金は発生しません。",
  ] as const,
  refund: "サービスの性質上、購入後の返金は原則として受け付けておりません。",
  environment:
    "最新のブラウザ（Google Chrome、Safari等）での利用を推奨しています。",
  addressDisclosure: "※請求があった場合、遅滞なく開示いたします",
} as const;

const LEGAL_ROWS: {
  label: string;
  renderValue: () => ReactNode;
}[] = [
  { label: "販売事業者", renderValue: () => LEGAL_SPEC.seller },
  { label: "運営責任者", renderValue: () => LEGAL_SPEC.operator },
  {
    label: "所在地",
    renderValue: () => (
      <>
        {LEGAL_SPEC.address}
        <span className="mt-1 block text-sm text-white/60">
          {LEGAL_SPEC.addressDisclosure}
        </span>
      </>
    ),
  },
  {
    label: "メールアドレス",
    renderValue: () => (
      <a
        href={`mailto:${LEGAL_SPEC.email}`}
        className="font-medium text-emerald-400/95 underline decoration-emerald-500/40 underline-offset-4 hover:text-emerald-300"
      >
        {LEGAL_SPEC.email}
      </a>
    ),
  },
  { label: "提供サービス名", renderValue: () => LEGAL_SPEC.serviceName },
  {
    label: "販売価格",
    renderValue: () => `Premiumプラン：${LEGAL_SPEC.price}`,
  },
  { label: "商品代金以外の必要料金", renderValue: () => LEGAL_SPEC.extraFees },
  { label: "支払方法", renderValue: () => LEGAL_SPEC.paymentMethod },
  { label: "支払時期", renderValue: () => LEGAL_SPEC.paymentTiming },
  { label: "サービス提供時期", renderValue: () => LEGAL_SPEC.deliveryTiming },
  {
    label: "解約方法",
    renderValue: () => (
      <span className="block space-y-2">
        {LEGAL_SPEC.cancellation.map((p) => (
          <span key={p} className="block">
            {p}
          </span>
        ))}
      </span>
    ),
  },
  { label: "返品・返金について", renderValue: () => LEGAL_SPEC.refund },
  { label: "動作環境", renderValue: () => LEGAL_SPEC.environment },
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

        <dl className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
          {LEGAL_ROWS.map((row, index) => (
            <div
              key={row.label}
              className={`grid grid-cols-1 gap-2 px-5 py-5 md:grid-cols-[minmax(140px,200px)_1fr] md:items-start md:gap-8 md:px-6 md:py-5 ${
                index !== LEGAL_ROWS.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <dt className="text-sm font-medium text-white/50 md:pt-0.5">
                {row.label}
              </dt>
              <dd className="text-sm leading-relaxed text-white md:text-[15px]">
                {row.renderValue()}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </LegalPageShell>
  );
}
