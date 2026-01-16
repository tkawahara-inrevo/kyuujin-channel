// app/admin/organizations/[id]/page.tsx
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
  category: string | null;
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

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString("ja-JP");
  } catch {
    return dt;
  }
}

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const organizationId = p.id;

  // 1) ログインユーザー取得
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          ログインしてください🥺
        </div>
      </main>
    );
  }

  // 2) admin_usersでロール確認（スーパーアドミンのみ）
  const { data: adminUser, error: adminUserErr } = await supabaseAdmin
    .from("admin_users")
    .select("user_id,role,organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminUserErr || !adminUser) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-slate-900">
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
  if (au.role !== "admin") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          このページはスーパーアドミンのみ閲覧できます🥺
        </div>
      </main>
    );
  }

  // 3) 企業の基本情報
  const { data: org, error: orgErr } = await supabaseAdmin
    .from("organizations")
    .select("id,name,slug,category,created_at")
    .eq("id", organizationId)
    .maybeSingle();

  if (orgErr) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          DBエラー（organizations）：{orgErr.message}
        </div>
      </main>
    );
  }

  if (!org) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          企業が見つからなかったよ🥺
          <div className="mt-3">
            <Link
              href="/admin"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              ← ダッシュボードへ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const orgRow = org as OrgRow;

  // 4) その企業の求人一覧
  const { data: jobs, error: jobsErr } = await supabaseAdmin
    .from("jobs")
    .select("id,organization_id,title,location,employment_type,salary,status,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  const jobList = (jobs ?? []) as JobRow[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {orgRow.name}
            </h1>
            <p className="mt-2 text-sm text-slate-800">
              企業詳細（基本情報＋その企業の求人一覧）
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              ← ダッシュボードへ戻る
            </Link>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">基本情報</h2>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <InfoRow label="企業名" value={orgRow.name} />
            <InfoRow label="slug" value={orgRow.slug} />
            <InfoRow label="カテゴリ" value={orgRow.category ?? "—"} />
            <InfoRow label="登録日時" value={fmt(orgRow.created_at)} />
            <InfoRow label="organization_id" value={orgRow.id} mono />
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-800">
            💡 将来ここに「凍結 / 削除」など運営操作を追加する想定
          </div>
        </div>
      </section>

      {/* Jobs */}
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            この企業の求人一覧
          </h2>
          <div className="text-sm text-slate-700">
            件数：<span className="font-semibold text-slate-900">{jobList.length}</span>
          </div>
        </div>

        {jobsErr && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            DBエラー（jobs）：{jobsErr.message}
          </div>
        )}

        {jobList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm">
            まだ求人がないよ
          </div>
        ) : (
          <div className="grid gap-3">
            {jobList.map((j) => (
              <div
                key={j.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-base font-semibold text-slate-900">{j.title}</div>
                  <StatusPill status={j.status} />
                  <div className="ml-auto text-xs text-slate-700">{fmt(j.created_at)}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-900">
                  {j.location && <Tag>📍 {j.location}</Tag>}
                  {j.employment_type && <Tag>🧩 {j.employment_type}</Tag>}
                  {j.salary && <Tag>💰 {j.salary}</Tag>}
                </div>

                <div className="mt-3 text-xs text-slate-700">job_id: {j.id}</div>

                {/* 編集画面を作ったら活かす（今はリンクだけ先に） */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/jobs/${j.id}/edit`}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    ✏️ 編集
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <div className="text-xs font-semibold text-slate-700">{label}</div>
      <div className={`text-sm text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</div>
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
