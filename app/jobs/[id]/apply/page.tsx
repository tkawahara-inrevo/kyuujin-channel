// app/jobs/[id]/apply/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ApplyForm from "./_components/ApplyForm";

type JobDetail = {
  id: string;
  title: string;
  status: "draft" | "published" | "closed";
  organization: { name: string } | { name: string }[] | null;
};

function orgName(org: JobDetail["organization"]): string {
  if (!org) return "（企業名未設定）";
  return Array.isArray(org) ? (org[0]?.name ?? "（企業名未設定）") : org.name;
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ✅ 応募フォームはログイン必須（ゲストはログインへ）
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/jobs/${id}/apply`)}`);
  }

  // ✅ 対象求人（公開中のみ）
  const { data: job, error } = await supabaseAdmin
    .from("jobs")
    .select(
      `
      id,
      title,
      status,
      organization:organizations(name)
    `
    )
    .eq("id", id)
    .maybeSingle<JobDetail>();

  if (error || !job) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10 text-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          {error ? `DBエラー：${error.message}` : "求人が見つかりません🥺"}
        </div>
        <div className="mt-4">
          <Link href="/jobs" className="text-sm font-semibold text-blue-600 hover:underline">
            ← 求人一覧へ
          </Link>
        </div>
      </main>
    );
  }

  if (job.status !== "published") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          この求人は公開されていません🥺
        </div>
        <div className="mt-4">
          <Link href={`/jobs/${job.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
            ← 求人詳細へ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-slate-900 pb-24">
      <Link href={`/jobs/${job.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
        ← 求人詳細へ
      </Link>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight">応募フォーム</h1>
        <div className="mt-2 text-sm text-slate-700">
          <div className="font-semibold">{job.title}</div>
          <div className="text-slate-600">{orgName(job.organization)}</div>
        </div>

        <div className="mt-6">
          <ApplyForm jobId={job.id} />
        </div>
      </section>
    </main>
  );
}
