import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            🧳
          </div>
          <div className="text-lg font-extrabold tracking-tight">求人ちゃんねる</div>
        </Link>

        <nav className="flex items-center gap-3 text-sm font-semibold">
          <Link href="/jobs" className="text-slate-700 hover:text-blue-600">
            求人一覧
          </Link>

          {user ? (
            <>
              <Link
                href="/my/applications"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                応募済み
              </Link>

              <Link
                href="/my/favorites"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                気になる
              </Link>

              <Link
                href="/profile"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                プロフィール
              </Link>

              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
