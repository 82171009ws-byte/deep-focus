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

export function capturePremiumClick(): void {
  if (typeof window === "undefined") return;
  try {
    initPostHogClient();
    posthog.capture("premium_click");
  } catch {
    /* PostHog 障害でアプリを止めない */
  }
}

/** App Router 用のページビュー（初回・ルート変更時） */
export function capturePosthogPageView(url: string): void {
  if (typeof window === "undefined") return;
  try {
    initPostHogClient();
    posthog.capture("$pageview", {
      $current_url: url,
    });
  } catch {
    /* noop */
  }
}
