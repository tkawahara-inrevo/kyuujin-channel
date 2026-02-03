// app/auth/after-login/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminUserRow = {
  user_id: string;
  role: "super_admin" | "client_admin";
  organization_id: string | null;
};

export default async function AfterLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const sp = await searchParams;
  const intent = (sp.intent ?? "").toLowerCase(); // "admin" | "super" | ""

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) redirect("/auth/login");

  const { data: adminUser } = await supabaseAdmin
    .from("admin_users")
    .select("user_id,role,organization_id")
    .eq("user_id", user.id)
    .maybeSingle<AdminUserRow>();

  if (!adminUser) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-slate-900 shadow-sm">
          <div className="text-lg font-bold">権限が見つからないよ🥺</div>
          <p className="mt-2 text-sm text-rose-700">
            このユーザーは admin_users に登録されていないみたい。
          </p>

          <form action="/api/auth/logout" method="post" className="mt-4">
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              いったんログアウト
            </button>
          </form>

          <div className="mt-4 text-sm">
            <Link href="/auth/login" className="underline">
              通常ログインへ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 入口ミス救済：intent があっても、role を最優先して飛ばす
  if (adminUser.role === "super_admin") redirect("/super");
  if (adminUser.role === "client_admin") redirect("/admin");

  // ここは通常到達しない想定
  if (intent === "super") redirect("/super");
  redirect("/admin");
}
