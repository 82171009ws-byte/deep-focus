import Link from "next/link";
import type { ReactNode } from "react";

type LegalPageShellProps = {
  title: string;
  children: ReactNode;
};

export function LegalPageShell({ title, children }: LegalPageShellProps) {
  return (
    <main className="min-h-dvh bg-[#0b0f14] text-white px-4 py-10 md:py-14">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <Link
            href="/lp"
            className="text-sm text-white/60 hover:text-white/90 underline decoration-white/30 underline-offset-4"
          >
            ← LPへ戻る
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="space-y-6 text-sm leading-relaxed text-white/85">
          {children}
        </div>
      </div>
    </main>
  );
}
