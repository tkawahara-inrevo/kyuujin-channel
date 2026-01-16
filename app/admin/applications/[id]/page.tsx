// app/admin/applications/[id]/page.tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import StatusBadge from "../StatusBadge"; // ✅ 修正（./ → ../）

type AdminUserRowLite = {
  role: "admin" | "client_admin";
  organization_id: string | null;
};

type JobEmbedded = {
  id: string;
  title: string;
};

type ApplicationDetailRaw = {
  id: string;
  job_id: string;
  organization_id: string;
  applicant_display_name: string;
  applicant_email: string | null;
  status: string;
  memo: string | null;
  created_at: string;
  job: JobEmbedded | JobEmbedded[] | null;

  // ✅ ⑥
  include_documents: boolean | null;
  resume_path: string | null;
  cv_path: string | null;
};

type ApplicationDetail = {
  id: string;
  job_id: string;
  applicant_display_name: string;
  applicant_email: string | null;
  status: string;
  memo: string | null;
  created_at: string;
  job: JobEmbedded;

  // ✅ ⑥
  include_documents: boolean;
  resume_path: string | null;
  cv_path: string | null;
};

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString("ja-JP");
  } catch {
    return dt;
  }
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

function normalizeDetail(a: ApplicationDetailRaw): ApplicationDetail | null {
  const j: JobEmbedded | null = Array.isArray(a.job) ? a.job[0] ?? null : a.job;
  if (!j) return null;

  return {
    id: a.id,
    job_id: a.job_id,
    applicant_display_name: a.applicant_display_name,
    applicant_email: a.applicant_email,
    status: a.status,
    memo: a.memo,
    created_at: a.created_at,
    job: { id: j.id, title: j.title },

    include_documents: Boolean(a.include_documents),
    resume_path: a.resume_path ?? null,
    cv_path: a.cv_path ?? null,
  };
}

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idRaw } = await params;
  const id = (idRaw ?? "").trim();

  if (!id || !isUuid(id)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">応募IDが不正です🥺</div>
      </main>
    );
  }

  // 1) ログイン必須
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">ログインしてください🥺</div>
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
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          このページは企業アドミンのみ閲覧できます🥺
        </div>
      </main>
    );
  }

  const organizationId = adminUser.organization_id;

  // 3) 応募取得（applications.organization_id で縛る）
  const { data: app, error: appErr } = await supabaseAdmin
    .from("applications")
    .select(
      `
      id,
      job_id,
      organization_id,
      applicant_display_name,
      applicant_email,
      status,
      memo,
      created_at,
      include_documents,
      resume_path,
      cv_path,
      job:jobs(
        id,
        title
      )
    `
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (appErr || !app) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">応募が見つかりません🥺</div>
        <div className="mt-4">
          <Link href="/admin/applications" className="text-sm font-semibold text-blue-600 hover:underline">
            ← 応募者一覧へ
          </Link>
        </div>
      </main>
    );
  }

  const detail = normalizeDetail(app as ApplicationDetailRaw);
  if (!detail) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">応募データの形式が不正です🥺</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">応募者プロフィール</h1>
            <p className="mt-2 text-sm text-slate-700">応募者の詳細情報</p>
          </div>

          <Link
            href={`/admin/applications?job_id=${detail.job.id}`}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            この求人の応募一覧 →
          </Link>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <div className="text-sm text-slate-600">応募者名</div>
            <div className="text-lg font-semibold">{detail.applicant_display_name}</div>
          </div>

          {detail.applicant_email && (
            <div>
              <div className="text-sm text-slate-600">メールアドレス</div>
              <div className="text-slate-900">{detail.applicant_email}</div>
            </div>
          )}

          <div>
            <div className="text-sm text-slate-600">応募した求人</div>
            <div className="font-semibold">{detail.job.title}</div>
          </div>

          <div>
            <div className="text-sm text-slate-600">応募日時</div>
            <div>{fmt(detail.created_at)}</div>
          </div>

          <div>
            <div className="text-sm text-slate-600">ステータス</div>
            <div className="mt-1">
              <StatusBadge id={detail.id} status={detail.status} />
            </div>
          </div>

          {/* ✅ ⑥：書類閲覧（動的ルートに統一） */}
          <div>
            <div className="text-sm text-slate-600">応募書類</div>

            {detail.include_documents ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={`/api/admin/applications/${detail.id}/file-url?kind=resume`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  履歴書を開く
                </a>

                <a
                  href={`/api/admin/applications/${detail.id}/file-url?kind=cv`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  職務経歴書を開く
                </a>

                {(!detail.resume_path || !detail.cv_path) && (
                  <div className="w-full text-sm text-amber-700">
                    ※ 一部の書類パスが空です（応募時に添付されていない可能性があります）
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-700">書類添付なし</div>
            )}
          </div>

          {detail.memo && (
            <div>
              <div className="text-sm text-slate-600">社内メモ</div>
              <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3">{detail.memo}</div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
