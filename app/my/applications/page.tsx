import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type OrgEmbed = { name: string };
type OrgEmbedAny = OrgEmbed | OrgEmbed[] | null;

type JobEmbed = {
  id: string;
  title: string;
  organization: OrgEmbedAny;
};
type JobEmbedAny = JobEmbed | JobEmbed[] | null;

type ApplicationRowDb = {
  id: string;
  created_at: string;
  status: string | null;
  job: JobEmbedAny;
};

type ApplicationVM = {
  applicationId: string;
  appliedAt: string;
  status: string;
  jobId: string | null;
  jobTitle: string;
  orgName: string;
};

function asOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function orgName(org: OrgEmbedAny | undefined): string {
  const one = asOne(org);
  return one?.name ?? "（企業名未設定）";
}

function fmtDate(dt: string) {
  try {
    return new Date(dt).toLocaleDateString("ja-JP");
  } catch {
    return dt;
  }
}

export default async function MyApplicationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent("/my/applications")}`);
  }

  const { data, error } = await supabaseAdmin
    .from("applications")
    .select(
      `
      id,
      created_at,
      status,
      job:jobs(
        id,
        title,
        organization:organizations(name)
      )
    `
    )
    .eq("applicant_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          エラーが発生しました🥺<br />
          {error.message}
        </div>
      </main>
    );
  }

  const rows = (data ?? []) as unknown as ApplicationRowDb[];

  const items: ApplicationVM[] = rows.map((a) => {
    const job = asOne(a.job);
    return {
      applicationId: a.id,
      appliedAt: fmtDate(a.created_at),
      status: (a.status ?? "new").toString(),
      jobId: job?.id ?? null,
      jobTitle: job?.title ?? "（求人削除済み）",
      orgName: orgName(job?.organization),
    };
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-slate-900">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">応募済み求人</h1>

        <Link
          href="/jobs"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          求人一覧へ
        </Link>
      </header>

      <section className="mt-8 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            まだ応募した求人はありません🥺
          </div>
        ) : (
          items.map((x) => {
            const href = x.jobId ? `/jobs/${x.jobId}` : "#";
            const clickable = !!x.jobId;

            return (
              <Link
                key={x.applicationId}
                href={href}
                aria-disabled={!clickable}
                className={`block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md ${
                  clickable ? "" : "pointer-events-none opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-extrabold">{x.jobTitle}</div>
                    <div className="mt-1 text-sm text-slate-600">{x.orgName}</div>
                  </div>

                  <div className="text-right text-sm text-slate-600">
                    <div>応募日：{x.appliedAt}</div>
                    <div className="mt-1 font-bold text-blue-600">{x.status}</div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </section>

      <div className="mt-8">
        <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline">
          ← ホームへ戻る
        </Link>
      </div>
    </main>
  );
}
