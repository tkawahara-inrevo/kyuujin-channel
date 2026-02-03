import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/auth/adminAccess";
import BillingClient from "./BillingClient";

export default async function AdminBillingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await getAdminAccess(user?.id);
  if (!access.ok) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          このページは企業管理者のみ閲覧できます🥺
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">課金管理</h1>
            <p className="mt-2 text-sm text-slate-700">今月の応募数から請求予定額を表示します（決済は未接続）</p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            ← ダッシュボード
          </Link>
        </div>

        <BillingClient />
      </div>
    </main>
  );
}
