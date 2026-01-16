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

type FavoriteRowDb = {
  id: string;
  created_at: string;
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

function fmtDate(dt: string) {
  try {
    return new Date(dt).toLocaleDateString("ja-JP");
  } catch {
    return dt;
  }
}

export default async function MyFavoritesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent("/my/favorites")}`);
  }

  const { data, error } = await supabaseAdmin
    .from("favorites")
    .select(
      `
      id,
      created_at,
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

  const rows = (data ?? []) as unknown as FavoriteRowDb[];

  const items = rows.map((r) => {
    const job = asOne(r.job);
    return {
      favId: r.id,
      savedAt: fmtDate(r.created_at),
      jobId: job?.id ?? null,
      jobTitle: job?.title ?? "（求人削除済み）",
      org: orgName(job?.organization),
    };
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-slate-900">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">気になる求人</h1>

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
            まだ保存した求人はありません🥺
          </div>
        ) : (
          items.map((x) => {
            const href = x.jobId ? `/jobs/${x.jobId}` : "#";
            const clickable = !!x.jobId;

            return (
              <Link
                key={x.favId}
                href={href}
                aria-disabled={!clickable}
                className={`block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md ${
                  clickable ? "" : "pointer-events-none opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-extrabold">{x.jobTitle}</div>
                    <div className="mt-1 text-sm text-slate-600">{x.org}</div>
                  </div>

                  <div className="text-right text-sm text-slate-600">
                    <div>保存日：{x.savedAt}</div>
                    <div className="mt-1 font-bold text-rose-600">保存済み</div>
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
