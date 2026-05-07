"use client";

import { useEffect, type ReactNode } from "react";
import { initPostHogClient } from "@/lib/posthog";

/**
 * クライアントのみで PostHog を初期化。RootLayout は Server Component のまま。
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHogClient();
  }, []);

  return <>{children}</>;
}
