import posthog from "posthog-js";

/** モジュール単位で二重 init を防ぐ（Strict Mode の useEffect 再実行にも対応） */
let clientInitialized = false;

export function initPostHogClient(): void {
  if (typeof window === "undefined") return;
  if (clientInitialized) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  clientInitialized = true;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    /** App Router のクライアント遷移は PostHogPageView で送る */
    capture_pageview: false,
    persistence: "localStorage+cookie",
  });
}

function safeCapture(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    initPostHogClient();
    posthog.capture(event, properties);
  } catch {
    /* PostHog 障害でアプリを止めない */
  }
}

/** Premium開始ボタン押下（1操作1回 — Checkout 側では送らない） */
export function capturePremiumClick(): void {
  safeCapture("premium_click");
}

export function captureUpsellModalOpen(): void {
  safeCapture("upsell_modal_open");
}

export function captureUpsellDismiss(): void {
  safeCapture("upsell_dismiss");
}

/** Stripe Checkout API 呼び出し直前 */
export function captureCheckoutStart(): void {
  safeCapture("checkout_start");
}

/** /success ページ表示時 */
export function captureCheckoutSuccess(): void {
  safeCapture("checkout_success");
}

export function captureTimerStart(properties?: { focus_minutes?: number; preset?: string }): void {
  safeCapture("timer_start", properties);
}

export type SoundSelectProperties = {
  sound_id: string;
  sound_label: string;
  is_premium: boolean;
};

export function captureSoundSelect(properties: SoundSelectProperties): void {
  safeCapture("sound_select", properties);
}

export function captureTaskAdd(): void {
  safeCapture("task_add");
}

export function captureReportView(): void {
  safeCapture("report_view");
}

/** App Router 用のページビュー（初回・ルート変更時） */
export function capturePosthogPageView(url: string): void {
  safeCapture("$pageview", { $current_url: url });
}
