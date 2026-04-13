"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("認証を確認しています…");

  useEffect(() => {
    const run = async () => {
      const oauthError = searchParams.get("error");
      const oauthDesc = searchParams.get("error_description");
      if (oauthError) {
        console.error("[auth/callback]", oauthError, oauthDesc);
        const q = oauthDesc ?? oauthError;
        router.replace(`/login?error=${encodeURIComponent(q)}`);
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[auth/callback] exchangeCodeForSession:", error.message);
          setStatus("ログインに失敗しました");
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
        router.replace("/");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        router.replace("/");
        return;
      }

      setStatus("認証情報が見つかりませんでした");
      router.replace("/login?error=missing_code");
    };

    void run();
  }, [router, searchParams]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 bg-[#0b0f14] text-white">
      <p className="text-sm text-white/70">{status}</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex flex-col items-center justify-center px-4 bg-[#0b0f14] text-white">
          <p className="text-sm text-white/70">読み込み中…</p>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
