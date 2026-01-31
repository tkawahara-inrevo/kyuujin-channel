import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/auth/adminAccess";
import { getAdminAnalytics } from "@/lib/analytics/getAnalytics";

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleDateString("ja-JP");
  } catch {
    return dt;
  }
}

export default async function AdminAnalyticsPage() {
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

  const analytics = await getAdminAnalytics(access.organization_id);

  const maxStatus = Math.max(1, ...analytics.by_status.map((s) => s.count));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">アナリティクス（簡易）</h1>
            <p className="mt-2 text-sm text-slate-700">実データから集計する“嘘なし”のライト版です</p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            ← ダッシュボード
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm text-slate-600">総応募数</div>
            <div className="mt-1 text-3xl font-bold">{analytics.total_applications}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm text-slate-600">直近7日（{fmt(analytics.since_iso)}〜）</div>
            <div className="mt-1 text-3xl font-bold">{analytics.last_7_days_applications}</div>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">ステータス別 応募数</h2>
          <div className="mt-3 grid gap-2">
            {analytics.by_status.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                まだ応募がありません
              </div>
            ) : (
              analytics.by_status.map((s) => (
                <div
                  key={s.status}
                  className="grid grid-cols-[140px_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="text-sm font-semibold text-slate-800">{s.status}</div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-blue-600"
                      style={{ width: `${Math.round((s.count / maxStatus) * 100)}%` }}
                    />
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{s.count}</div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">求人別 応募数（上位20件）</h2>
          <div className="mt-3 grid gap-2">
            {analytics.by_job.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                まだ求人がありません
              </div>
            ) : (
              analytics.by_job.map((j) => (
                <div key={j.job_id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold">{j.title || "（無題の求人）"}</div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
                    {j.count}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
