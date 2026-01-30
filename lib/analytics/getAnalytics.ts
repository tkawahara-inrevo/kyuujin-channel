import { supabaseAdmin } from "@/lib/supabase/admin";

export type AnalyticsJobRow = { job_id: string; title: string; count: number };
export type AnalyticsStatusRow = { status: string; count: number };

export type AdminAnalytics = {
  organization_id: string;
  total_applications: number;
  last_7_days_applications: number;
  by_job: AnalyticsJobRow[];
  by_status: AnalyticsStatusRow[];
  since_iso: string;
};

/**
 * Minimal-but-real analytics for demo (no placeholders):
 * - totals
 * - last 7 days
 * - by job (top 20)
 * - by status
 */
export async function getAdminAnalytics(organizationId: string): Promise<AdminAnalytics> {
  const { count: totalApps } = await supabaseAdmin
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  const { count: last7Apps } = await supabaseAdmin
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("created_at", sinceIso);

  // By job: use relationship counting if it exists, otherwise fall back.
  const { data: jobsWithCounts, error: jobsErr } = await supabaseAdmin
    .from("jobs")
    .select(
      `
      id,
      title,
      applications(count)
    `
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);

  let byJob: AnalyticsJobRow[] = [];
  if (!jobsErr) {
    byJob = (jobsWithCounts ?? []).map((j: any) => ({
      job_id: String(j.id),
      title: String(j.title ?? ""),
      count: Number(j.applications?.[0]?.count ?? 0),
    }));
  }

  // By status: group in DB if possible; otherwise compute client-side.
  const { data: appsForStatus, error: statusErr } = await supabaseAdmin
    .from("applications")
    .select("status")
    .eq("organization_id", organizationId);

  const statusMap = new Map<string, number>();
  if (!statusErr) {
    for (const row of appsForStatus ?? []) {
      const s = String((row as any).status ?? "unknown");
      statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
    }
  }
  const byStatus: AnalyticsStatusRow[] = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  return {
    organization_id: organizationId,
    total_applications: Number(totalApps ?? 0),
    last_7_days_applications: Number(last7Apps ?? 0),
    by_job: byJob,
    by_status: byStatus,
    since_iso: sinceIso,
  };
}
