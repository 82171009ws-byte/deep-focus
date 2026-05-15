const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** App Router 用のページビュー（初回・ルート変更時）。PostHog とは独立。 */
export function sendGaPageView(pathWithQuery: string): void {
  if (typeof window === "undefined" || !GA_ID) return;
  try {
    window.gtag?.("config", GA_ID, {
      page_path: pathWithQuery,
      send_page_view: true,
    });
  } catch {
    /* GA 障害でアプリを止めない */
  }
}
