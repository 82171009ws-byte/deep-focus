import Link from "next/link";
import { LP_FOOTER_LINKS, LP_HERO } from "../copy";

export function LpFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/20 px-4 py-12 md:py-14">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{LP_HERO.productName}</p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/55">
            集中のための Web アプリ。タイマーと環境音で作業に入りやすい空間を。
          </p>
        </div>
        <nav aria-label="フッターリンク">
          <ul className="flex flex-col gap-3 text-sm md:items-end">
            {LP_FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-white/70 underline decoration-white/25 underline-offset-4 hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-5xl text-center text-xs text-white/40">
        © {new Date().getFullYear()} {LP_HERO.productName}
      </p>
    </footer>
  );
}
