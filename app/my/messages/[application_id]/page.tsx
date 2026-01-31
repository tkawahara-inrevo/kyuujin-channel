import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ChatThread from "./ChatThread";

// 切り分け優先：キャッシュや静的最適化の影響を受けにくくする
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidUuid(v: string) {
  // UUID v4 だけに絞らず、一般的なUUID形式を許容
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export default async function MyMessageThreadPage({
  params,
}: {
  // “どっちのビルド/ルート名でも拾える” ために両対応
  params: { application_id?: string; applicationId?: string };
}) {
  const application_id = params.application_id ?? params.applicationId ?? "";

  // ここで undefined / "undefined" を確実に弾く（クエリ400連打の元を断つ）
  if (!application_id || application_id === "undefined") {
    notFound();
  }

  // UUIDっぽくない値が来たら即notFound（変な値でAPI叩かない）
  if (!isValidUuid(application_id)) {
    notFound();
  }

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

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">メッセージ</h1>
            <p className="mt-2 text-sm text-slate-700">応募ID: {application_id}</p>
            {/* 切り分け用：必要なら一時的に表示（問題解決後に消してOK）
            <p className="mt-1 text-xs text-slate-500">params: {JSON.stringify(params)}</p>
            */}
          </div>

          <div className="flex gap-2">
            <Link
              href="/my/messages"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              ← 一覧へ
            </Link>
          </div>
        </div>

        <ChatThread applicationId={application_id} />
      </div>
    </main>
  );
}
