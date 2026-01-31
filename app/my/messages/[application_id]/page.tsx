import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ChatThread from "./ChatThread";

// 切り分け優先：静的化/キャッシュ影響を避ける（原因確定したら消してOK）
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MyMessageThreadPage({
  params,
}: {
  params: { application_id?: string };
}) {
  const application_id = params?.application_id;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          ログインしてください🥺
        </div>
      </main>
    );
  }

  // ここが今回の切り分けポイント：画面で params を確認できるようにする
  if (!application_id || application_id === "undefined") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">メッセージ</h1>
          <p className="mt-2 text-sm text-slate-700">
            応募IDが取得できませんでした🥺
          </p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
            <div className="font-semibold">debug</div>
            <div className="mt-2">params: {JSON.stringify(params)}</div>
            <div className="mt-1">application_id: {String(application_id)}</div>
          </div>

          <div className="mt-6">
            <Link
              href="/my/messages"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              ← 一覧へ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">メッセージ</h1>
            <p className="mt-2 text-sm text-slate-700">応募ID: {application_id}</p>

            {/* デバッグ：一時表示（直ったら消してOK） */}
            <p className="mt-1 text-xs text-slate-500">
              params: {JSON.stringify(params)}
            </p>
          </div>

          <Link
            href="/my/messages"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            ← 一覧へ
          </Link>
        </div>

        <ChatThread applicationId={application_id} />
      </div>
    </main>
  );
}
