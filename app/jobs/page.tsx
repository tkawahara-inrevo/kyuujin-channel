// app/jobs/page.tsx
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

type JobRow = {
  id: string;
  title: string;
  location: string | null;
  salary: string | null;
  employment_type: string | null;
  created_at: string;
  organization: { name: string; category: string | null } | { name: string; category: string | null }[] | null;
};

function orgName(org: JobRow["organization"]): string {
  if (!org) return "（企業名未設定）";
  return Array.isArray(org) ? (org[0]?.name ?? "（企業名未設定）") : org.name;
}
function orgCategory(org: JobRow["organization"]): string {
  if (!org) return "";
  const c = Array.isArray(org) ? org[0]?.category : org.category;
  return c ?? "";
}
function fmtDate(dt: string): string {
  try {
    return new Date(dt).toLocaleDateString("ja-JP");
  } catch {
    return dt;
  }
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const category = (sp.category ?? "").trim();
  const tag = (sp.tag ?? "").trim(); // 今は表示用（DBタグが無ければ後で対応）

  // 公開中求人だけ
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select(
      `
      id,
      title,
      location,
      salary,
      employment_type,
      created_at,
      organization:organizations(
        name,
        category
      )
    `
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(100);

  const raw = (data ?? []) as JobRow[];

  // ここで軽くフィルタ（DB側で完全にやるのは後でOK）
  const list = raw.filter((j) => {
    const titleHit = !q || j.title.toLowerCase().includes(q.toLowerCase());
    const categoryHit = !category || orgCategory(j.organization) === category;
    // tag はDBが無いなら無視（今は導線優先）
    const tagHit = true;
    return titleHit && categoryHit && tagHit;
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-slate-900">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">求人一覧</h1>
          <p className="mt-2 text-sm text-slate-600">
            公開中の求人だけ表示されます
          </p>
        </div>

        <Link
          href="/"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          ← ホーム
        </Link>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          DBエラー：{error.message}
        </div>
      ) : null}

      {/* 検索 */}
      <form className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1">
            <div className="text-sm font-semibold">キーワード</div>
            <input
              name="q"
              defaultValue={q}
              placeholder="例：キッチン、エンジニア"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>

          <label className="grid gap-1">
            <div className="text-sm font-semibold">カテゴリ</div>
            <input
              name="category"
              defaultValue={category}
              placeholder="例：エンジニア"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>

          <label className="grid gap-1">
            <div className="text-sm font-semibold">タグ（準備中）</div>
            <input
              name="tag"
              defaultValue={tag}
              placeholder="例：リモートワーク"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white hover:bg-blue-700">
            検索
          </button>
          <Link
            href="/jobs"
            className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          >
            リセット
          </Link>

          <div className="ml-auto text-sm text-slate-600">
            件数：<span className="font-semibold text-slate-900">{list.length}</span>
          </div>
        </div>
      </form>

      {/* 一覧 */}
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
            該当する求人がありません🥺
          </div>
        ) : (
          list.map((j) => (
            <Link
              key={j.id}
              href={`/jobs/${j.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:ring-1 hover:ring-blue-100"
            >
              <div className="text-lg font-extrabold">{j.title}</div>
              <div className="mt-1 text-sm text-slate-700">{orgName(j.organization)}</div>

              <div className="mt-4 grid gap-2 text-sm text-slate-700">
                <div>📍 {j.location ?? "勤務地未設定"}</div>
                <div>💰 {j.salary ?? "給与未設定"}</div>
                <div>🧩 {j.employment_type ?? "雇用形態未設定"}</div>
                <div className="text-xs text-slate-500">📅 {fmtDate(j.created_at)}</div>
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
