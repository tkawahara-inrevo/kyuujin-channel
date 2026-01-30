import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ReviewSection from "./ReviewSection";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  created_at: string;
};

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: org, error } = await supabaseAdmin
    .from("organizations")
    .select("id,name,slug,category,created_at")
    .eq("slug", slug)
    .maybeSingle<OrgRow>();

  if (error || !org) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">企業が見つかりません🥺</div>
        <div className="mt-4">
          <Link href="/jobs" className="text-sm font-semibold text-blue-600 hover:underline">
            求人一覧へ →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{org.name}</h1>
            {org.category && <p className="mt-2 text-sm text-slate-700">カテゴリ: {org.category}</p>}
          </div>
          <Link
            href="/jobs"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            ← 求人一覧
          </Link>
        </div>
      </div>

      <ReviewSection organizationId={org.id} />
    </main>
  );
}
