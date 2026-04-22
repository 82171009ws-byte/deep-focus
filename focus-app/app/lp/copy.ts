/**
 * LP および法務ページの仮文言。Stripe 審査・集客向けに後から差し替えやすくするため集約しています。
 */

export const LP_HERO = {
  productName: "Deep Focus",
  tagline: "集中のための、シンプルなタイマーアプリ",
  subcopy:
    "タイマー、ホワイトノイズ、テーマ切り替えで、作業に入りやすい環境を整えるWebアプリです。",
  ctaPrimary: "今すぐ使う",
  ctaSecondary: "Premiumを見る",
} as const;

export const LP_FEATURES = [
  {
    title: "タイマー",
    description:
      "ポモドーロなど、集中と休憩のリズムを整えやすいタイマー機能です。",
  },
  {
    title: "ホワイトノイズ",
    description:
      "環境音で雑音をマスキングし、集中のための音場をつくれます。",
  },
  {
    title: "タスク管理",
    description:
      "やることを整理しながら、タイマーと連携して作業に没入できます。",
  },
  {
    title: "テーマ切り替え",
    description:
      "背景・見た目を切り替え、作業モードに合わせた雰囲気を選べます。",
  },
  {
    title: "レポート機能",
    description:
      "集中時間の振り返りに役立つレポートで、継続のヒントを得られます。",
  },
] as const;

/** 料金表示はプレースホルダー。Stripe ダッシュボードと合わせて更新してください。 */
export const LP_PREMIUM = {
  heading: "Premiumプラン（月額）",
  priceDisplay: "¥480 / 月（税込）※仮の表示です",
  note: "※ 実際の料金・請求タイミングは決済画面の表示に準じます。",
  benefits: [
    "全テーマ解放",
    "ホワイトノイズ2つ同時再生",
    "プレミアムノイズ",
    "詳細レポート",
  ],
} as const;

export const LP_SCREENSHOTS = {
  heading: "アプリの様子",
  captions: ["メイン画面（差し替え予定）", "設定・レポート（差し替え予定）"],
} as const;

export const LP_FAQ = [
  {
    q: "無料でも使えますか？",
    a: "はい。基本機能は無料でご利用いただけます。Premium は追加機能の利用に向けた有料プランです。",
  },
  {
    q: "Premiumはいつでも解約できますか？",
    a: "はい。所定の手続きにより解約できます。詳細は決済サービス（Stripe）のポータルまたはアプリ内の案内をご確認ください。",
  },
  {
    q: "スマホでも使えますか？",
    a: "ブラウザからアクセスできる Web アプリです。スマートフォンのブラウザでもご利用いただけます。",
  },
] as const;

export const LP_FOOTER_LINKS = [
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/legal", label: "特定商取引法に基づく表記" },
  { href: "/contact", label: "お問い合わせ" },
] as const;
