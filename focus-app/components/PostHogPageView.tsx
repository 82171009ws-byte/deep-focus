"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { capturePosthogPageView } from "@/lib/posthog";

/**
 * クライアントサイドのルート変更ごとに $pageview を送信。
 * useSearchParams 利用のため layout 側で Suspense で包むこと。
 */
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSentUrl = useRef<string | null>(null);

  useEffect(() => {
    const search = searchParams.toString();
    const pathWithQuery = `${pathname}${search ? `?${search}` : ""}`;
    const fullUrl = `${window.location.origin}${pathWithQuery}`;

    if (lastSentUrl.current === fullUrl) return;
    lastSentUrl.current = fullUrl;
    capturePosthogPageView(fullUrl);
  }, [pathname, searchParams]);

  return null;
}
