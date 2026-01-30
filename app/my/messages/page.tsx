import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ApplicationRow = {
  id: string;
  created_at: string;
  status: string;
  job: { id: string; title: string } | { id: string; title: string }[] | null;
};

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString("ja-JP");
  } catch {
    return dt;
  }
}

function normalizeJob(j: ApplicationRow["job"]): { id: string; title: string } | null {
  const jj = Array.isArray(j) ? j[0] ?? null : j;
  return jj ? { id: jj.id, title: jj.title } : null;
}

export default async function MyMessagesIndex() {
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

  const { data: apps } = await supabaseAdmin
    .from("applications")
    .select(
      `
      id,
      created_at,
      status,
      job:jobs(
        id,
        title
      )
    `
    )
    .eq("applicant_user_id", user.id)
    .order("created_at", { ascending: false });

  const list = (apps ?? []) as ApplicationRow[];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">メッセージ</h1>
            <p className="mt-2 text-sm text-slate-700">応募ごとに企業とやり取りできます</p>
          </div>
          <Link href="/my/applications" className="text-sm font-semibold text-blue-600 hover:underline">
            応募履歴へ →
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {list.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              まだ応募がありません
            </div>
          ) : (
            list.map((a) => {
              const job = normalizeJob(a.job);
              return (
                <Link
                  key={a.id}
                  href={`/my/messages/${a.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
                >
                  <div className="text-sm text-slate-600">{fmt(a.created_at)}</div>
                  <div className="mt-1 font-semibold">{job?.title ?? "（求人）"}</div>
                  <div className="mt-1 text-sm text-slate-700">ステータス: {a.status}</div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
