import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type OrganizationLite = { name: string; slug: string };

type JobLite = {
  id: string;
  title: string;
  organization?: OrganizationLite | OrganizationLite[] | null;
};

type ApplicationRow = {
  id: string;
  created_at: string;
  status: string;
  job: JobLite | JobLite[] | null;
};

type ConversationRow = { id: string; application_id: string };

type MessageLite = {
  conversation_id: string;
  sender_type: "applicant" | "company";
  created_at: string;
};

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString("ja-JP");
  } catch {
    return dt;
  }
}

function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function normalizeJob(j: ApplicationRow["job"]): { id: string; title: string } | null {
  const jj = firstOrNull(j);
  return jj ? { id: jj.id, title: jj.title } : null;
}

function getOrgNameFromJob(job: ApplicationRow["job"]): string | null {
  const jj = firstOrNull(job);
  if (!jj) return null;

  const org = jj.organization ?? null;
  const oo = firstOrNull(org);
  return oo ? oo.name : null;
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
        title,
        organization:organizations(
          name,
          slug
        )
      )
    `
    )
    .eq("applicant_user_id", user.id)
    .order("created_at", { ascending: false });

  const list = (apps ?? []) as ApplicationRow[];

  const appIds = list.map((a) => a.id);
  const convoMap = new Map<string, string>(); // application_id -> conversation_id
  const latestByConversation = new Map<string, MessageLite>();

  if (appIds.length > 0) {
    const { data: convs } = await supabaseAdmin.from("conversations").select("id,application_id").in("application_id", appIds);

    const convoList = (convs ?? []) as ConversationRow[];
    convoList.forEach((c) => convoMap.set(c.application_id, c.id));

    const convoIds = convoList.map((c) => c.id);
    if (convoIds.length > 0) {
      const { data: msgs } = await supabaseAdmin
        .from("messages")
        .select("conversation_id,sender_type,created_at")
        .in("conversation_id", convoIds)
        .order("created_at", { ascending: false });

      const rows = (msgs ?? []) as MessageLite[];
      // created_at desc なので、最初に見つかったものを latest として採用
      for (const r of rows) {
        if (!latestByConversation.has(r.conversation_id)) {
          latestByConversation.set(r.conversation_id, r);
        }
      }
    }
  }

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
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">まだ応募がありません</div>
          ) : (
            list.map((a) => {
              const job = normalizeJob(a.job);

              // ✅ 企業名（型安全）
              const orgName = getOrgNameFromJob(a.job);

              // ✅ 新着（最新が company ならバッジ）
              const convId = convoMap.get(a.id);
              const latest = convId ? latestByConversation.get(convId) : null;
              const hasNew = latest?.sender_type === "company";

              return (
                <Link
                  key={a.id}
                  href={`/my/messages/${a.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-slate-600">{fmt(a.created_at)}</div>
                      <div className="mt-1 truncate text-lg font-extrabold">{job?.title ?? "（求人）"}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-700">{orgName ?? "（企業）"}</div>
                      <div className="mt-2 text-sm text-slate-700">
                        ステータス: <span className="font-bold">{a.status}</span>
                      </div>
                    </div>
                    <div className="mb-2 rounded bg-yellow-100 p-2 text-xs font-bold">ROUTE: /my/messages/[application_id]</div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {hasNew ? (
                        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">新着メッセージ</span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500"> </span>
                      )}
                      <span className="text-xs font-semibold text-slate-500">→</span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
