// app/admin/applications/page.tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import StatusBadge from "./StatusBadge";
import { isUuidLoose } from "@/lib/validators/uuid";

type AdminUserRowLite = {
  role: "admin" | "client_admin";
  organization_id: string | null;
};

type JobStatus = "draft" | "published" | "closed";

type PublishedJobRow = {
  id: string;
  title: string;
  status: JobStatus;
};

type ApplicationWithJob = {
  id: string;
  job_id: string;
  organization_id: string;
  applicant_display_name: string;
  created_at: string;
  status: string;
  job: {
    id: string;
    title: string;
  };
};

// ✅ Supabaseの返り：job が「オブジェクト」または「配列」どっちもあり得る
type JobEmbedded = { id: string; title: string };
type ApplicationRaw = {
  id: string;
  job_id: string;
  organization_id: string;
  applicant_display_name: string;
  created_at: string;
  status: string;
  job: JobEmbedded | JobEmbedded[] | null;
};

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString("ja-JP");
  } catch {
    return dt;
  }
}

function normalizeApplication(a: ApplicationRaw): ApplicationWithJob | null {
  const j: JobEmbedded | null = Array.isArray(a.job) ? a.job[0] ?? null : a.job;
  if (!j) return null;

  return {
    id: a.id,
    job_id: a.job_id,
    organization_id: a.organization_id,
    applicant_display_name: a.applicant_display_name,
    created_at: a.created_at,
    status: a.status,
    job: { id: j.id, title: j.title },
  };
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ job_id?: string }>;
}) {
  const sp = await searchParams;
  const jobIdRaw = (sp.job_id ?? "").trim();
  const jobId = jobIdRaw && isUuidLoose(jobIdRaw) ? jobIdRaw : "";

  // 1) ログイン必須
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          ログインしてください🥺
        </div>
      </main>
    );
  }

  // 2) client_admin のみ
  const { data: adminUser, error: adminUserErr } = await supabaseAdmin
    .from("admin_users")
    .select("role,organization_id")
    .eq("user_id", user.id)
    .maybeSingle<AdminUserRowLite>();

  if (
    adminUserErr ||
    !adminUser ||
    adminUser.role !== "client_admin" ||
    !adminUser.organization_id
  ) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          このページは企業アドミンのみ閲覧できます🥺
        </div>
      </main>
    );
  }

  const organizationId = adminUser.organization_id;

  // 3) フィルタ用：公開中求人
  const { data: publishedJobs, error: jobsErr } = await supabaseAdmin
    .from("jobs")
    .select("id,title,status")
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const jobList = (publishedJobs ?? []) as PublishedJobRow[];

  // 4) 応募一覧（自社の応募だけ）
  let appsQuery = supabaseAdmin
    .from("applications")
    .select(
      `
      id,
      job_id,
      organization_id,
      applicant_display_name,
      created_at,
      status,
      job:jobs(
        id,
        title
      )
    `
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (jobId) {
    appsQuery = appsQuery.eq("job_id", jobId);
  }

  const { data: apps, error: appsErr } = await appsQuery;

  const rawList = (apps ?? []) as ApplicationRaw[];
  const list: ApplicationWithJob[] = rawList
    .map(normalizeApplication)
    .filter((v): v is ApplicationWithJob => v !== null);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">応募者一覧</h1>
            <p className="mt-2 text-sm text-slate-700">自社求人への応募だけが表示されます</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              ← ダッシュボード
            </Link>
          </div>
        </div>

        {(jobsErr || appsErr) && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            DBエラー：
            {jobsErr?.message ? <div className="mt-1">{jobsErr.message}</div> : null}
            {appsErr?.message ? <div className="mt-1">{appsErr.message}</div> : null}
          </div>
        )}

        {/* フィルタ */}
        <form className="mt-4 flex flex-wrap items-center gap-2">
          <select
            name="job_id"
            defaultValue={jobId}
            className="min-w-[280px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">すべての求人（自社）</option>
            {jobList.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            絞り込む
          </button>

          <Link
            href="/admin/applications"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            リセット
          </Link>

          <div className="ml-auto text-sm text-slate-700">
            件数：<span className="font-semibold text-slate-900">{list.length}</span>
          </div>
        </form>

        {jobIdRaw && !jobId && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            job_id が不正だったので、フィルタを無視しました🥺
          </div>
        )}
      </div>

      {/* 一覧 */}
      <section className="mt-6">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm">
            応募がまだありません🥺
          </div>
        ) : (
          <div className="grid gap-3">
            {list.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:ring-1 hover:ring-blue-100"
              >
                {/* ヘッダ行：左はLink、右はStatusBadge（Link外） */}
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/applications/${a.id}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-slate-900">
                        {a.applicant_display_name}
                      </div>
                    </div>
                  </Link>

                  <div className="ml-auto flex items-center gap-2">
                    <div className="text-xs text-slate-700">{fmt(a.created_at)}</div>
                    <StatusBadge id={a.id} status={a.status} />
                  </div>
                </div>

                {/* 本文：ここもLinkにしてカードっぽく */}
                <Link href={`/admin/applications/${a.id}`} className="mt-2 block">
                  <div className="text-sm text-slate-800">
                    応募求人：
                    <span className="ml-2 font-semibold text-slate-900">{a.job.title}</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
