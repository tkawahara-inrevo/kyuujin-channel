// app/super/_components/SuperHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/super", label: "ホーム", emoji: "👑" },
  { href: "/super/organizations", label: "企業", emoji: "🏢" },
];

export default function SuperHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/10 bg-black/30 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/super" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black">
            👑
          </div>
          <div className="text-sm font-extrabold tracking-tight">運営コンソール</div>
        </Link>

        <nav className="flex items-center gap-2 text-sm font-semibold">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-xl px-3 py-2 transition",
                  active ? "bg-white text-black" : "text-white/80 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <span className="mr-1">{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}

          <div className="ml-2 h-6 w-px bg-white/15" />

          <form action="/api/auth/logout" method="post" className="ml-2">
            <button
              type="submit"
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              ログアウト
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
