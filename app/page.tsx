// app/page.tsx
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type JobStatus = "draft" | "published" | "closed";

type JobRow = {
  id: string;
  title: string;
  location: string | null;
  salary: string | null;
  employment_type: string | null;
  created_at: string;
  status: JobStatus;
  organization:
    | { name: string; category: string | null }
    | { name: string; category: string | null }[]
    | null;
};

type JobCardVM = {
  id: string;
  title: string;
  companyName: string;
  location: string;
  salary: string;
  employmentType: string;
  createdAt: string;
  imageUrl: string;
};

type CategoryVM = {
  label: string;
  count: number;
  href: string;
};

function fmtDate(dt: string): string {
  try {
    return new Date(dt).toLocaleDateString("ja-JP");
  } catch {
    return dt;
  }
}

function orgName(org: JobRow["organization"]): string {
  if (!org) return "";
  return Array.isArray(org) ? (org[0]?.name ?? "") : org.name;
}
function orgCategory(org: JobRow["organization"]): string {
  if (!org) return "";
  const c = Array.isArray(org) ? org[0]?.category : org.category;
  return c ?? "";
}

function toJobCardVM(j: JobRow): JobCardVM {
  return {
    id: j.id,
    title: j.title,
    companyName: orgName(j.organization) || "（企業名未設定）",
    location: j.location ?? "勤務地未設定",
    salary: j.salary ?? "給与未設定",
    employmentType: j.employment_type ?? "雇用形態未設定",
    createdAt: fmtDate(j.created_at),
    imageUrl: "/images/job-placeholder.jpg",
  };
}

export default async function HomePage() {
  // ✅ ログイン状態（ヘッダー表示の出し分け用）
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 公開中求人をまとめて取得（表示用に organization 名/カテゴリも）
  const { data } = await supabaseAdmin
    .from("jobs")
    .select(
      `
      id,
      title,
      location,
      salary,
      employment_type,
      status,
      created_at,
      organization:organizations(
        name,
        category
      )
    `
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(30);

  const jobs = (data ?? []) as JobRow[];
  const featured = jobs.slice(0, 3).map(toJobCardVM);
  const newest = jobs.slice(3, 6).map(toJobCardVM);

  const categoryCounts = new Map<string, number>();
  for (const j of jobs) {
    const cat = orgCategory(j.organization);
    if (!cat) continue;
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }

  const categoryOrder = ["エンジニア", "デザイナー", "マーケティング", "セールス", "事務・管理", "その他"];
  const categories: CategoryVM[] = categoryOrder.map((label) => ({
    label,
    count: categoryCounts.get(label) ?? 0,
    href: `/jobs?category=${encodeURIComponent(label)}`,
  }));

  const tags = [
    "リモートワーク",
    "在宅勤務",
    "週休2日制",
    "未経験歓迎",
    "正社員",
    "年間休日120日以上",
    "土日祝休み",
    "駅近",
    "高収入",
    "フレックスタイム",
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              🧳
            </div>
            <div className="text-lg font-extrabold tracking-tight">求人ちゃんねる</div>
          </Link>

          <nav className="flex items-center gap-4 text-sm font-semibold">
            {/* ✅ ゲストはプロフィールを“絶対に表示しない” */}
{user ? (
  <>
    <Link
      href="/my/applications"
      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
    >
      応募済み
    </Link>
<Link
  href="/my/favorites"
  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
>
  気になる
</Link>

    <Link
      href="/profile"
      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
    >
      プロフィール
    </Link>

    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
      >
        ログアウト
      </button>
    </form>
  </>
) : (
  <Link
    href="/auth/login"
    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
  >
    ログイン
  </Link>
)}

          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-blue-600">
        <div className="mx-auto max-w-6xl px-6 py-20 text-white">
          <h1 className="text-center text-4xl font-extrabold tracking-tight md:text-5xl">
            あなたに最適な仕事を見つけよう
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base/7 text-white/90">
            数多くの求人情報から、あなたにぴったりの仕事が見つかります
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-extrabold text-blue-700 shadow-lg hover:opacity-95"
            >
              🔎 求人を探す
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-[#EFF1F7]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-center text-2xl font-extrabold">カテゴリから探す</h2>

          <div className="mt-10 grid gap-4 md:grid-cols-6">
            {categories.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm hover:shadow-md hover:ring-1 hover:ring-blue-100"
              >
                <div className="text-base font-bold">{c.label}</div>
                <div className="mt-2 text-sm text-slate-600">{c.count}件</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold">⭐ 注目の求人</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {featured.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
            {featured.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-3">
                公開中の求人がありません🥺
              </div>
            ) : null}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/jobs"
              className="rounded-2xl border border-blue-200 bg-white px-10 py-4 text-base font-extrabold text-blue-700 hover:bg-blue-50"
            >
              注目の求人をもっと見る
            </Link>
          </div>
        </div>
      </section>

      {/* Newest */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-14">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold">📈 新着求人</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {newest.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/jobs"
              className="rounded-2xl border border-emerald-200 bg-white px-10 py-4 text-base font-extrabold text-emerald-700 hover:bg-emerald-50"
            >
              新着求人をもっと見る
            </Link>
          </div>
        </div>
      </section>

      {/* Tags */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">🔎 タグから探す</h2>

          <div className="mt-6 flex flex-wrap gap-3">
            {tags.map((t) => (
              <Link
                key={t}
                href={`/jobs?tag=${encodeURIComponent(t)}`}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                🧳
              </div>
              <div className="text-lg font-extrabold">求人ちゃんねる</div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              最適な仕事を見つけるためのお手伝いをします。
            </p>
          </div>

          <div>
            <div className="text-sm font-extrabold">求人情報</div>
            <div className="mt-4 grid gap-2 text-sm text-slate-700">
              <Link href="/jobs" className="hover:text-blue-600">求人一覧</Link>
              <Link href="/company" className="hover:text-blue-600">会社概要</Link>
            </div>
          </div>

          <div>
            <div className="text-sm font-extrabold">サポート</div>
            <div className="mt-4 grid gap-2 text-sm text-slate-700">
              <Link href="/contact" className="hover:text-blue-600">お問い合わせ</Link>
              <Link href="/terms" className="hover:text-blue-600">利用規約（求職者）</Link>
              <Link href="/terms/company" className="hover:text-blue-600">利用規約（企業）</Link>
              <Link href="/privacy" className="hover:text-blue-600">プライバシーポリシー</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 py-6 text-center text-sm text-slate-600">
          © 2026 求人ちゃんねる. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function JobCard({ job }: { job: JobCardVM }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:ring-1 hover:ring-blue-100"
    >
      <div className="h-44 w-full bg-slate-200" />

      <div className="p-5">
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-lg bg-emerald-100 px-3 py-1 text-emerald-800">新着</span>
          <span className="rounded-lg bg-blue-100 px-3 py-1 text-blue-800">注目</span>
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-slate-800">エンジニア</span>
          <span className="rounded-lg bg-violet-100 px-3 py-1 text-violet-800">正社員</span>
        </div>

        <div className="mt-4 text-lg font-extrabold">{job.title}</div>
        <div className="mt-2 text-sm text-slate-700">{job.companyName}</div>

        <div className="mt-4 grid gap-2 text-sm text-slate-700">
          <div>📍 {job.location}</div>
          <div>💰 {job.salary}</div>
          <div>📅 {job.createdAt}</div>
        </div>

        <div className="mt-4 text-sm text-slate-600">まずは気軽に求人をチェックしてみてね。</div>
      </div>
    </Link>
  );
}
