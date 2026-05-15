"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { sendGaPageView } from "@/lib/gtag";

/**
 * クライアントサイドのルート変更ごとに page_view を送信。
 * useSearchParams 利用のため layout 側で Suspense で包むこと。
 */
export function GoogleAnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSentPath = useRef<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GA_ID) return;

    const search = searchParams.toString();
    const pathWithQuery = `${pathname}${search ? `?${search}` : ""}`;

    if (lastSentPath.current === pathWithQuery) return;
    lastSentPath.current = pathWithQuery;
    sendGaPageView(pathWithQuery);
  }, [pathname, searchParams]);

  return null;
}
