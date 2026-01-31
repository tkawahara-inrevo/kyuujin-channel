import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ChatThread from "./ChatThread";

export default async function MyMessageThreadPage({
  params,
}: {
  params: Promise<{ application_id: string }>;
}) {
  const { application_id } = await params;

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
