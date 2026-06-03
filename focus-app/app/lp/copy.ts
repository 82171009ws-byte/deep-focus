/**
 * LP のコピー・料金表記。特定商取引法ページと表記を揃えて更新してください。
 */

export const LP_HERO = {
  productName: "Deep Focus",
  tagline: "集中のための、シンプルなタイマーアプリ",
  subcopy:
    "タイマー、ホワイトノイズ、テーマ切り替えで、作業に入りやすい環境を整えるWebアプリです。",
  focusHook: "25分がしんどい日でも、まず10分から。",
  focusSubhook: "仕事終わりや資格勉強前でも、10分だけなら始めやすい。",
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

export const LP_PREMIUM = {
  heading: "Premiumプラン（月額）",
  priceDisplay: "¥490 / 月（税込）",
  note: "表示の料金・課金タイミングの詳細は、決済画面（Stripe）の表記に準じます。",
  benefits: [
    "全テーマ解放",
    "ホワイトノイズ2つ同時再生",
    "プレミアムノイズ",
    "詳細レポート",
  ],
} as const;

export const LP_SCREENSHOTS = {
  heading: "アプリの様子",
  /** PC / スマホのデバイスモック（`public` 配下） */
  mockups: [
    {
      src: "/images/mockup-pc.png",
      alt: "PCブラウザで Deep Focus を表示した画面",
      width: 1200,
      height: 750,
    },
    {
      src: "/images/mockup-mobile.png",
      alt: "スマートフォンで Deep Focus を表示した画面",
      width: 750,
      height: 1200,
    },
  ] as const,
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
