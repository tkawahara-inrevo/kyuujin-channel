// app/admin/_components/AdminHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  emoji: string;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "ダッシュボード", emoji: "🏠" },
  { href: "/admin/applications", label: "応募", emoji: "📨" },
  { href: "/admin/analytics", label: "分析", emoji: "📊" },
  { href: "/admin/billing", label: "請求", emoji: "💰" },
];

export default function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            🏢
          </div>
          <div className="text-sm font-extrabold tracking-tight text-slate-900">
            企業管理
          </div>
        </Link>

        <nav className="flex items-center gap-2 text-sm font-semibold">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-xl px-3 py-2 transition",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")}
              >
                <span className="mr-1">{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}

          <div className="ml-2 h-6 w-px bg-slate-200" />

          <Link
            href="/admin/jobs/new"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ➕ 求人
          </Link>

          <Link
            href="/admin/organizations/new"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            🏢➕ 企業
          </Link>

          <form action="/api/auth/logout" method="post" className="ml-2">
            <button
              type="submit"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ログアウト
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
