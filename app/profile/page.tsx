import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ProfileFilesClient from "./_components/ProfileFilesClient";

type ApplicantRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  resume_path: string | null;
  cv_path: string | null;
  created_at: string;
};

function fmtDate(dt: string): string {
  try {
    return new Date(dt).toLocaleDateString("ja-JP");
  } catch {
    return dt;
  }
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent("/profile")}`);
  }

  const { data: applicant, error } = await supabaseAdmin
    .from("applicants")
    .select("id,display_name,email,phone,resume_path,cv_path,created_at")
    .eq("id", user.id)
    .maybeSingle<ApplicantRow>();

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10 text-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          DBエラー：{error.message}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-slate-900">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">プロフィール</h1>
          <p className="mt-2 text-sm text-slate-600">会員情報と書類アップロード</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/jobs"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            求人一覧
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4">
          <div>
            <div className="text-xs font-bold text-slate-500">表示名</div>
            <div className="mt-1 text-base font-semibold">
              {applicant?.display_name ?? user.user_metadata?.display_name ?? "（未設定）"}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-500">メールアドレス</div>
            <div className="mt-1 text-base font-semibold">{applicant?.email ?? user.email ?? "（未設定）"}</div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-500">電話番号</div>
            <div className="mt-1 text-base font-semibold">
              {applicant?.phone ?? (user.user_metadata?.phone as string | undefined) ?? "（未設定）"}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-500">登録日</div>
            <div className="mt-1 text-sm text-slate-600">{applicant?.created_at ? fmtDate(applicant.created_at) : "—"}</div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-extrabold">書類アップロード</h2>
        <p className="mt-2 text-sm text-slate-600">
          対応形式：PDF / DOCX / XLSX（最大10MB）
        </p>

        <div className="mt-5 grid gap-4">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-sm font-bold">履歴書</div>
            <div className="mt-1 text-sm text-slate-600">
              {applicant?.resume_path ? "アップロード済み ✅" : "未アップロード"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-sm font-bold">職務経歴書</div>
            <div className="mt-1 text-sm text-slate-600">
              {applicant?.cv_path ? "アップロード済み ✅" : "未アップロード"}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ProfileFilesClient
            hasResume={!!applicant?.resume_path}
            hasCv={!!applicant?.cv_path}
          />
        </div>
      </section>

      <div className="mt-8">
        <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline">
          ← ホームへ戻る
        </Link>
      </div>
    </main>
  );
}
