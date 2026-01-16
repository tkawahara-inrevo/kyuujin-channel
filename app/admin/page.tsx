// app/admin/page.tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminUserRow = {
  user_id: string;
  role: "admin" | "client_admin";
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
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          ログインしてください🥺
        </div>
      </main>
    );
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
  if (au.role === "client_admin") {
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

  return <SuperAdminDashboard />;
}

/* ---------------- Super Admin ---------------- */

async function SuperAdminDashboard() {
  const { data: orgs, error: orgErr } = await supabaseAdmin
    .from("organizations")
    .select("id,name,slug,created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const orgList = (orgs ?? []) as OrgRow[];

  const { count: orgCount, error: orgCountErr } = await supabaseAdmin
    .from("organizations")
    .select("*", { count: "exact", head: true });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900">
      <Header
        title="スーパーアドミン ダッシュボード"
        subtitle="運営用（企業の追加・状況把握）"
        actions={
          <>
            <Link
              href="/admin/organizations/new"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              🏢➕ 企業を追加
            </Link>
            <Link
              href="/admin/jobs/new"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              ➕ 新規求人
            </Link>
          </>
        }
      />

      {(orgErr || orgCountErr) && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          DBエラー：
          {orgErr?.message ? <div className="mt-1">{orgErr.message}</div> : null}
          {orgCountErr?.message ? <div className="mt-1">{orgCountErr.message}</div> : null}
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <StatCard label="総企業数" value={orgCount ?? 0} />
        <StatCard label="最近追加（表示中）" value={orgList.length} />
        <StatCard label="企業追加へ" valueText="→" href="/admin/organizations/new" />
      </div>

      <section className="mt-8">
        <SectionTitle title="最近追加された企業" />
        {orgList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm">
            まだ企業がないよ🥺（右上の「企業を追加」から作ってね）
          </div>
        ) : (
          <div className="grid gap-3">
            {orgList.map((o) => (
              <Link
                key={o.id}
                href={`/admin/organizations/${o.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:ring-1 hover:ring-blue-100"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-base font-semibold text-slate-900">{o.name}</div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-900">
                    slug: {o.slug}
                  </span>
                  <div className="ml-auto text-xs text-slate-700">{fmt(o.created_at)}</div>
                </div>
                <div className="mt-3 text-xs text-slate-700">organization_id: {o.id}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
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

  // 集計は “全件” を見る（カードが常にトリガーになるように）
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

      {/* 🔎 求人検索（ダッシュボード内完結） */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-base font-semibold text-slate-900">求人検索</div>

        <form className="mt-3 flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="キーワード検索（求人タイトル）"
            className="w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          {/* status は hidden で維持（キーワード検索中にステータスを保つ） */}
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

          {(q || activeStatus) && (
            <div className="ml-auto text-sm text-slate-600">
              フィルタ：
              {q ? (
                <span className="ml-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                  q: {q}
                </span>
              ) : null}
              {activeStatus ? (
                <span className="ml-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                  status: {activeStatus}
                </span>
              ) : null}
            </div>
          )}
        </form>
      </section>

      {/* ステータスカード：検索起爆剤 */}
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <StatCard
          label="自社求人（直近）"
          value={counts.total ?? 0}
          href={q ? `/admin?q=${encodeURIComponent(q)}` : "/admin"}
          active={!activeStatus}
        />
        <StatCard
          label="下書き"
          value={counts.draft ?? 0}
          href={q ? `/admin?status=draft&q=${encodeURIComponent(q)}` : "/admin?status=draft"}
          active={activeStatus === "draft"}
        />
        <StatCard
          label="公開中"
          value={counts.published ?? 0}
          href={
            q
              ? `/admin?status=published&q=${encodeURIComponent(q)}`
              : "/admin?status=published"
          }
          active={activeStatus === "published"}
        />
        <StatCard
          label="募集終了"
          value={counts.closed ?? 0}
          href={q ? `/admin?status=closed&q=${encodeURIComponent(q)}` : "/admin?status=closed"}
          active={activeStatus === "closed"}
        />
      </div>

      <section className="mt-8">
        <SectionTitle title="求人一覧" />
        <JobList jobs={list} />
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
  subtitle: string;
  badge?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-800">{subtitle}</p>
          {badge && <div className="mt-2 text-xs text-slate-700">{badge}</div>}
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueText,
  href,
  active,
}: {
  label: string;
  value?: number;
  valueText?: string;
  href?: string;
  active?: boolean;
}) {
  const inner = (
    <div
      className={[
        "rounded-2xl border bg-white p-5 shadow-sm",
        active ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200",
      ].join(" ")}
    >
      <div className="text-sm text-slate-800">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">
        {typeof value === "number" ? value : valueText ?? 0}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-95">
        {inner}
      </Link>
    );
  }
  return inner;
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>;
}

function JobList({ jobs }: { jobs: JobRowWithAppsCount[] }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm">
        まだ求人がないよ
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {jobs.map((j) => {
        const appCount =
          j.applications.length > 0 && typeof j.applications[0].count === "number"
            ? j.applications[0].count
            : 0;

        return (
          <div
            key={j.id}
            className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:ring-1 hover:ring-blue-100"
          >
            {/* ✅ カード全体クリック用の透明リンク（求人編集へ） */}
            <Link
              href={`/admin/jobs/${j.id}`}
              className="absolute inset-0 rounded-2xl"
              aria-label={`${j.title} を編集`}
            />

            {/* ✅ 中身は前面に（応募リンクなどが押せる） */}
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-base font-semibold text-slate-900">{j.title}</div>

                <StatusPill status={j.status} />

                {appCount > 0 ? (
                  <Link
                    href={`/admin/applications?job_id=${encodeURIComponent(j.id)}`}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    応募 {appCount}件
                  </Link>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    応募 0件
                  </span>
                )}

                <div className="ml-auto text-xs text-slate-700">{fmt(j.created_at)}</div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-900">
                {j.location && <Tag>📍 {j.location}</Tag>}
                {j.employment_type && <Tag>🧩 {j.employment_type}</Tag>}
                {j.salary && <Tag>💰 {j.salary}</Tag>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-900">{children}</span>;
}

function StatusPill({ status }: { status: "draft" | "published" | "closed" }) {
  const map: Record<typeof status, { label: string; cls: string }> = {
    draft: { label: "下書き", cls: "bg-slate-100 text-slate-900" },
    published: { label: "公開中", cls: "bg-emerald-100 text-emerald-900" },
    closed: { label: "募集終了", cls: "bg-rose-100 text-rose-900" },
  };
  const s = map[status];
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}
