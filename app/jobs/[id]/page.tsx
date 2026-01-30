import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import FavoriteButton from "./_components/FavoriteButton";

type JobDetail = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  location: string | null;
  salary: string | null;
  employment_type: string | null;
  status: "draft" | "published" | "closed";
  created_at: string;
  organization: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

function orgName(org: JobDetail["organization"]): string {
  if (!org) return "（企業名未設定）";
  return Array.isArray(org) ? (org[0]?.name ?? "（企業名未設定）") : org.name;
}

function orgSlug(org: JobDetail["organization"]): string | null {
  if (!org) return null;
  const o = Array.isArray(org) ? org[0] ?? null : org;
  return o?.slug ?? null;
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ✅ ログイン状態
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ✅ 求人取得
  const { data: job, error } = await supabaseAdmin
    .from("jobs")
    .select(
      `
      id,
      organization_id,
      title,
      description,
      location,
      salary,
      employment_type,
      status,
      created_at,
      organization:organizations(name,slug)
    `
    )
    .eq("id", id)
    .maybeSingle<JobDetail>();

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10 text-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          DBエラー：{error.message}
        </div>
        <div className="mt-4">
          <Link href="/jobs" className="text-sm font-semibold text-blue-600 hover:underline">
            ← 求人一覧へ
          </Link>
        </div>
      </main>
    );
  }

  if (!job || job.status !== "published") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          この求人は公開されていません🥺
        </div>
        <div className="mt-4">
          <Link href="/jobs" className="text-sm font-semibold text-blue-600 hover:underline">
            ← 求人一覧へ
          </Link>
        </div>
      </main>
    );
  }

  const nextUrl = `/jobs/${job.id}/apply`;
  const applyHref = user
    ? nextUrl
    : `/auth/login?next=${encodeURIComponent(nextUrl)}`;

  // ✅ 応募済みチェック（ログイン時のみ）
  let alreadyApplied = false;
  if (user) {
    const { data: appliedRow } = await supabaseAdmin
      .from("applications")
      .select("id")
      .eq("applicant_user_id", user.id)
      .eq("job_id", job.id)
      .limit(1)
      .maybeSingle();

    alreadyApplied = !!appliedRow;
  }

  // ✅ お気に入り済みチェック（ログイン時のみ）
  let isFavorite = false;
  if (user) {
    const { data: favRow } = await supabaseAdmin
      .from("favorites")
      .select("id")
      .eq("applicant_user_id", user.id)
      .eq("job_id", job.id)
      .limit(1)
      .maybeSingle();

    isFavorite = !!favRow;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-slate-900">
      <Link href="/jobs" className="text-sm font-semibold text-blue-600 hover:underline">
        ← 求人一覧へ
      </Link>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* メイン */}
        <section className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-tight">{job.title}</h1>
          <div className="mt-2 text-sm text-slate-700">
            {orgSlug(job.organization) ? (
              <Link href={`/organizations/${orgSlug(job.organization)}`} className="font-semibold text-blue-600 hover:underline">
                {orgName(job.organization)}
              </Link>
            ) : (
              <span>{orgName(job.organization)}</span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-sm text-slate-700">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              📍 {job.location ?? "勤務地未設定"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              🧩 {job.employment_type ?? "雇用形態未設定"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              💰 {job.salary ?? "給与未設定"}
            </span>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-extrabold">仕事内容</h2>
            {job.description ? (
              <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                {job.description}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600">詳細は準備中です</div>
            )}
          </div>
        </section>

        {/* サイド */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-700">応募する</div>
          <p className="mt-2 text-sm text-slate-600">
            応募は会員登録・ログイン後に行えます🫶
          </p>

          {user && alreadyApplied ? (
            <>
              <div className="mt-6 block rounded-2xl bg-slate-200 py-4 text-center text-base font-extrabold text-slate-600">
                応募済み
              </div>
              <Link
                href="/my/applications"
                className="mt-3 block rounded-2xl border border-slate-200 bg-white py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                応募済み一覧を見る
              </Link>
            </>
          ) : (
            <>
              <Link
                href={applyHref}
                className="mt-6 block rounded-2xl bg-blue-600 py-4 text-center text-base font-extrabold text-white hover:bg-blue-700"
              >
                {user ? "この求人に応募する" : "ログインして応募する"}
              </Link>

              {!user ? (
                <Link
                  href={`/auth/signup?next=${encodeURIComponent(nextUrl)}`}
                  className="mt-3 block rounded-2xl border border-slate-200 bg-white py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  会員登録（無料）
                </Link>
              ) : null}
            </>
          )}

          {/* ✅ お気に入り（ログイン済みのみ） */}
          {user ? <FavoriteButton jobId={job.id} initialIsFavorite={isFavorite} /> : null}
        </aside>
      </div>
    </main>
  );
}
