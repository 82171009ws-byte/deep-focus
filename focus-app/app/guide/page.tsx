import Link from "next/link";

export default function GuidePage() {
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
          <h1 className="mt-4 text-xl font-semibold">アプリの使い方</h1>
        </div>

        <ul className="space-y-4 text-sm text-white/80 leading-relaxed list-disc pl-5">
          <li>作業・短休憩・長休憩のポモドーロタイマーで集中時間を区切ります。</li>
          <li>プリセットで集中・休憩の長さを選べます。</li>
          <li>タスク名をタップして、いま取り組むタスクを選びます。</li>
          <li>ホワイトノイズで環境音を足せます（プレミアムで種類が増えます）。</li>
          <li>テーマで背景の雰囲気を変えられます。</li>
          <li>連続日数は、当日に1本以上の作業ポモを完了すると更新されます。</li>
        </ul>
      </div>
    </main>
  );
}
