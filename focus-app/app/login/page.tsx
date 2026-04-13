"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("error");
    if (q) {
      setErrorMessage(decodeURIComponent(q));
    }
  }, [searchParams]);

  const signInWithGoogle = useCallback(async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) {
      setErrorMessage(error.message);
      setGoogleLoading(false);
    }
  }, []);

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
        <h1 className="text-xl font-semibold text-center mb-4">ログイン</h1>

        <button
          type="button"
          disabled={googleLoading || loading}
          onClick={() => void signInWithGoogle()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-gray-900 font-semibold hover:bg-white/90 disabled:opacity-60 disabled:pointer-events-none border border-white/10"
        >
          <GoogleGlyph />
          {googleLoading ? "Google に移動中…" : "Google で続ける"}
        </button>

        <p className="mt-4 text-center text-xs text-white/45">または</p>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
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
            disabled={loading || googleLoading}
            className="mt-1 w-full py-3 rounded-xl bg-white/15 border border-white/25 text-white font-semibold hover:bg-white/20 disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? "ログイン中…" : "メールでログイン"}
          </button>
        </form>

        <Link
          href="/signup"
          className="mt-4 block w-full py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm font-medium text-white/85 hover:bg-white/15 text-center"
        >
          新規登録はこちら
        </Link>

        <Link
          href="/"
          className="mt-3 block w-full py-2 text-sm text-center text-white/50 hover:text-white/75"
        >
          トップに戻る
        </Link>
      </div>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex flex-col items-center justify-center px-4 bg-[#0b0f14] text-white">
          <p className="text-sm text-white/70">読み込み中…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
