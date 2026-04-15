"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type HomeSettingsHandlers = {
  openTheme: () => void;
  openNoise: () => void;
  openPremium: () => void;
  openBilling: () => void | Promise<void>;
};

/**
 * /?settings=theme|noise|premium|billing でホーム上の既存モーダルを開き、クエリを消す。
 */
export function HomeSettingsFromQuery({
  handlersRef,
}: {
  handlersRef: MutableRefObject<HomeSettingsHandlers>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    const s = searchParams.get("settings");
    if (!s) {
      prev.current = null;
      return;
    }
    if (prev.current === s) return;
    prev.current = s;

    const h = handlersRef.current;
    if (s === "theme") h.openTheme();
    else if (s === "noise") h.openNoise();
    else if (s === "premium") h.openPremium();
    else if (s === "billing") void h.openBilling();

    router.replace("/", { scroll: false });
  }, [searchParams, router, handlersRef]);

  return null;
}
