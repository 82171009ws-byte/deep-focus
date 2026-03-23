import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-4 bg-[#0b0f14] text-white">
      <h1 className="text-xl font-semibold text-center">お支払いありがとうございます</h1>
      <p className="text-white/70 text-sm text-center max-w-md leading-relaxed">
        プレミアムのご登録が完了しました。
        <br />
        テストモードでは実際の課金は発生しません。
      </p>
      <Link
        href="/"
        className="mt-2 px-5 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-medium hover:bg-white/90"
      >
        アプリに戻る
      </Link>
    </main>
  );
}
