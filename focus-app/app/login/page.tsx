"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setErrorMessage(null);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        router.push("/");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "ログインに失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [email, password, router]
  );

  // すでにログイン済みならトップへ
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session?.user) router.push("/");
      })
      .catch(() => {});
  }, [router]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-4 bg-[#0b0f14] text-white">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-center mb-3">ログイン</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-sm text-white/70">
            メールアドレス
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-white/20"
            />
          </label>
          <label className="text-sm text-white/70">
            パスワード
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-white/20"
            />
          </label>

          {errorMessage && (
            <p className="text-sm text-red-200/95 bg-red-500/15 border border-red-500/25 rounded-xl px-3 py-2">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-3 rounded-xl bg-white text-gray-900 font-semibold hover:bg-white/90 disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? "ログイン中…" : "ログイン"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push("/signup")}
          className="mt-4 w-full py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm font-medium text-white/85 hover:bg-white/15"
        >
          新規登録はこちら
        </button>
      </div>
    </main>
  );
}

