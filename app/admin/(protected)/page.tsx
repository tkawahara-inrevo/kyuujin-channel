// app/admin/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminUserRow = {
  user_id: string;
  role: "super_admin" | "client_admin";
  organization_id: string | null;
};

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

type JobRow = {
  id: string;
  organization_id: string;
  title: string;
  location: string | null;
  employment_type: string | null;
  salary: string | null;
  status: "draft" | "published" | "closed";
  created_at: string;
};

type JobStatus = "draft" | "published" | "closed";
type StatusParam = JobStatus | "";

function parseStatusParam(s: string): StatusParam {
  if (s === "draft" || s === "published" || s === "closed") return s;
  return "";
}

type JobStatusRow = { status: JobStatus };

// Supabase の `applications(count)` 用
type AppsCountRow = { count: number };
type JobRowWithAppsCount = JobRow & { applications: AppsCountRow[] };

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString("ja-JP");
  } catch {
    return dt;
  }
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = parseStatusParam((sp.status ?? "").trim());

  // 1) ログインユーザー取得（cookieセッション）
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect("/admin/login");
  }

  // 2) admin_users を取得（service role）
  const { data: adminUser, error: adminUserErr } = await supabaseAdmin
    .from("admin_users")
    .select("user_id,role,organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminUserErr || !adminUser) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          このアカウントは管理者として登録されていないよ🥺
          {adminUserErr?.message ? (
            <div className="mt-2 text-xs text-rose-700">{adminUserErr.message}</div>
          ) : null}
        </div>
      </main>
    );
  }

  const au = adminUser as AdminUserRow;

  // 3) role別に分岐
  // super_admin が /admin に来ちゃったら、/super に誘導（入口ミス救済）
  if (au.role === "super_admin") {
    redirect("/super");
  }

  // 企業admin以外はここで止める
  if (au.role !== "client_admin") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          このページは企業アドミン専用だよ🥺
          <div className="mt-3">
            <Link href="/super" className="underline">
              運営コンソールへ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!au.organization_id) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          organization_id が未設定だよ🥺（client_adminは必須）
        </div>
      </main>
    );
  }

  return <ClientAdminDashboard organizationId={au.organization_id} q={q} status={status} />;
}

/* ---------------- Client Admin ---------------- */

async function ClientAdminDashboard({
  organizationId,
  q,
  status,
}: {
  organizationId: string;
  q: string;
  status: StatusParam;
}) {
  // 自社情報
  const { data: org, error: orgErr } = await supabaseAdmin
    .from("organizations")
    .select("id,name,slug,created_at")
    .eq("id", organizationId)
    .maybeSingle();

  const orgRow = (org ?? null) as OrgRow | null;

  // 検索用の jobs（表示用：フィルタ適用）
  let jobsQuery = supabaseAdmin
    .from("jobs")
    .select(
      "id,organization_id,title,location,employment_type,salary,status,created_at,applications(count)"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (q) {
    jobsQuery = jobsQuery.ilike("title", `%${q}%`);
  }
  if (status) {
    jobsQuery = jobsQuery.eq("status", status);
  }

  const { data: jobs, error: jobsErr } = await jobsQuery;
  const list = (jobs ?? []) as JobRowWithAppsCount[];

  // 集計は “全件” を見る
  const { data: allJobs } = await supabaseAdmin
    .from("jobs")
    .select("status")
    .eq("organization_id", organizationId);

  const rows = (allJobs ?? []) as JobStatusRow[];

  const counts = rows.reduce(
    (acc, j) => {
      acc.total += 1;
      acc[j.status] += 1;
      return acc;
    },
    { total: 0, draft: 0, published: 0, closed: 0 }
  );

  const activeStatus = status || "";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900">
      <Header
        title={orgRow ? `${orgRow.name} ダッシュボード` : "企業ダッシュボード"}
        subtitle="あなたの会社のデータだけが表示されます"
        badge={orgRow ? `slug: ${orgRow.slug}` : undefined}
        actions={
          <>
            <Link
              href="/admin/applications"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              👥 応募者状況
            </Link>
            <Link
              href="/admin/jobs/new"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              ➕ 新規求人を作成
            </Link>
          </>
        }
      />

      {(orgErr || jobsErr) && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          DBエラー：
          {orgErr?.message ? <div className="mt-1">{orgErr.message}</div> : null}
          {jobsErr?.message ? <div className="mt-1">{jobsErr.message}</div> : null}
        </div>
      )}

      {/* 🔎 求人検索 */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-base font-semibold text-slate-900">求人検索</div>

        <form className="mt-3 flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="キーワード検索（求人タイトル）"
            className="w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <input type="hidden" name="status" value={activeStatus} />

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            検索
          </button>

          <Link
            href="/admin"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            リセット
          </Link>
        </form>
      </section>

      {/* 📌 ステータスカード */}
      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatusCard label="総数" count={counts.total} active={!status} href={`/admin?q=${encodeURIComponent(q)}`} />
        <StatusCard
          label="下書き"
          count={counts.draft}
          active={status === "draft"}
          href={`/admin?status=draft&q=${encodeURIComponent(q)}`}
        />
        <StatusCard
          label="公開中"
          count={counts.published}
          active={status === "published"}
          href={`/admin?status=published&q=${encodeURIComponent(q)}`}
        />
        <StatusCard
          label="終了"
          count={counts.closed}
          active={status === "closed"}
          href={`/admin?status=closed&q=${encodeURIComponent(q)}`}
        />
      </section>

      {/* 🧾 最新求人 */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-slate-900">最新の求人</div>
          <Link href="/admin/jobs/new" className="text-sm font-semibold text-blue-700 underline">
            ➕ 作成する
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map((j) => (
            <Link
              key={j.id}
              href={`/admin/jobs/${j.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{j.title}</div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {j.status}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-600">作成: {fmt(j.created_at)}</div>
              <div className="mt-1 text-xs text-slate-600">
                応募: {(j.applications?.[0]?.count ?? 0).toString()}
              </div>
            </Link>
          ))}
          {list.length === 0 && <div className="text-sm text-slate-600">求人がまだないよ🥺</div>}
        </div>
      </section>
    </main>
  );
}

/* ---------------- UI parts ---------------- */

function Header({
  title,
  subtitle,
  badge,
  actions,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
          {badge ? (
            <div className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {badge}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

function StatusCard({
  label,
  count,
  active,
  href,
}: {
  label: string;
  count: number;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-2xl border p-5 shadow-sm transition",
        active ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-slate-900">{count}</div>
    </Link>
  );
}
