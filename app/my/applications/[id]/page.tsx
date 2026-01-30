import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ChatThread from "./ChatThread";

type OrgEmbed = { name: string };
type OrgEmbedAny = OrgEmbed | OrgEmbed[] | null;
type JobEmbed = { id: string; title: string; organization: OrgEmbedAny };
type JobEmbedAny = JobEmbed | JobEmbed[] | null;

type ApplicationRow = {
  id: string;
  created_at: string;
  status: string | null;
  job_id: string;
  organization_id: string;
  applicant_user_id: string | null;
  applicant_display_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  applicant_message: string | null;
  include_documents: boolean | null;
  resume_path: string | null;
  cv_path: string | null;
  job: JobEmbedAny;
};

function asOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function orgName(org: OrgEmbedAny | undefined): string {
  const one = asOne(org);
  return one?.name ?? "（企業名未設定）";
}

function fmtDateTime(dt: string) {
  try {
    return new Date(dt).toLocaleString("ja-JP");
  } catch {
    return dt;
  }
}

export default async function MyApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/my/applications/${id}`)}`);
  }

  const { data: app, error } = await supabaseAdmin
    .from("applications")
    .select(
      `
      id,
      created_at,
      status,
      job_id,
      organization_id,
      applicant_user_id,
      applicant_display_name,
      applicant_email,
      applicant_phone,
      applicant_message,
      include_documents,
      resume_path,
      cv_path,
      job:jobs(
        id,
        title,
        organization:organizations(name)
      )
    `
    )
    .eq("id", id)
    .maybeSingle<ApplicationRow>();

  if (error || !app) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10 text-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          応募情報が見つかりませんでした🥺
          {error ? <div className="mt-2 text-sm text-rose-700">{error.message}</div> : null}
        </div>
        <div className="mt-6">
          <Link href="/my/applications" className="text-sm font-semibold text-blue-600 hover:underline">
            ← 応募済み一覧へ
          </Link>
        </div>
      </main>
    );
  }

  // ✅ 応募者本人のみ閲覧可（最低限）
  if (app.applicant_user_id && app.applicant_user_id !== user.id) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10 text-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          この応募情報は閲覧できません🥺
        </div>
        <div className="mt-6">
          <Link href="/my/applications" className="text-sm font-semibold text-blue-600 hover:underline">
            ← 応募済み一覧へ
          </Link>
        </div>
      </main>
    );
  }

  const job = asOne(app.job);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-slate-900">
      <Link href="/my/applications" className="text-sm font-semibold text-blue-600 hover:underline">
        ← 応募済み一覧へ
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-2xl font-extrabold tracking-tight">{job?.title ?? "（求人情報）"}</div>
        <div className="mt-1 text-sm text-slate-700">{orgName(job?.organization)}</div>

        <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2">
          <div className="text-sm text-slate-700">
            <span className="font-bold">応募日：</span>
            {fmtDateTime(app.created_at)}
          </div>
          <div className="text-sm text-slate-700">
            <span className="font-bold">ステータス：</span>
            <span className="font-bold text-blue-600">{(app.status ?? "new").toString()}</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm font-extrabold">応募者情報</div>
          <div className="mt-2 text-sm text-slate-700">
            <div>名前：{app.applicant_display_name ?? "-"}</div>
            <div>メール：{app.applicant_email ?? "-"}</div>
            <div>電話：{app.applicant_phone ?? "-"}</div>
          </div>
          {app.applicant_message ? (
            <div className="mt-4">
              <div className="text-sm font-extrabold">メッセージ</div>
              <div className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                {app.applicant_message}
              </div>
            </div>
          ) : null}
        </div>

        {job?.id ? (
          <div className="mt-6">
            <Link href={`/jobs/${job.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
              求人詳細を見る →
            </Link>
          </div>
        ) : null}
      </div>

      {/* ✅ ここにチャット（応募単位） */}
      <ChatThread applicationId={app.id} />
    </main>
  );
}
