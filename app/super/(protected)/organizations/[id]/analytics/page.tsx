// app/super/(protected)/organizations/[id]/analytics/page.tsx
import { getAdminAnalytics } from "@/lib/analytics/getAnalytics";
import { supabaseAdmin } from "@/lib/supabase/admin";
import PageHeader from "@/app/_components/PageHeader";

export default async function SuperOrgAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const a = await getAdminAnalytics(id);

const { data: org } = await supabaseAdmin
  .from("organizations")
  .select("id,name")
  .eq("id", id)
  .maybeSingle();

const orgName = org?.name ?? "企業";

  return (
    <div className="grid gap-4">
      <PageHeader
  variant="super"
  crumbs={[
    { label: "運営", href: "/super" },
    { label: "企業一覧", href: "/super/organizations" },
    { label: orgName, href: `/super/organizations/${id}` },
    { label: "応募分析" },
  ]}
  title="応募分析"
/>


      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/70">総応募数</div>
          <div className="mt-1 text-3xl font-extrabold">{a.total_applications}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/70">直近7日（since={a.since_iso.slice(0, 10)}）</div>
          <div className="mt-1 text-3xl font-extrabold">{a.last_7_days_applications}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-lg font-bold">求人別</div>
        <div className="mt-3 grid gap-2 text-sm text-white/80">
          {a.by_job.map((r) => (
            <div key={r.job_id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2">
              <div className="truncate">{r.title}</div>
              <div className="font-bold">{r.count}</div>
            </div>
          ))}
          {a.by_job.length === 0 && <div className="text-white/70">データなし</div>}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-lg font-bold">ステータス別</div>
        <div className="mt-3 grid gap-2 text-sm text-white/80">
          {a.by_status.map((r) => (
            <div key={r.status} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2">
              <div className="capitalize">{r.status}</div>
              <div className="font-bold">{r.count}</div>
            </div>
          ))}
          {a.by_status.length === 0 && <div className="text-white/70">データなし</div>}
        </div>
      </div>
    </div>
  );
}
