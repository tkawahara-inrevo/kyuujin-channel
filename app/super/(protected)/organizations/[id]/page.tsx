// app/super/(protected)/organizations/[id]/page.tsx
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import PageHeader from "@/app/_components/PageHeader";

type OrgRow = { id: string; name: string; slug: string; created_at: string };

export default async function SuperOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data } = await supabaseAdmin
    .from("organizations")
    .select("id,name,slug,created_at")
    .eq("id", id)
    .maybeSingle<OrgRow>();

  if (!data) {
    return <div className="text-sm text-white/80">企業が見つからないよ🥺</div>;
  }

  return (
    <div className="grid gap-4">
      <PageHeader
  variant="super"
  crumbs={[
    { label: "運営", href: "/super" },
    { label: "企業一覧", href: "/super/organizations" },
    { label: data.name },
  ]}
  title={data.name}
  backFallbackHref="/super/organizations"
/>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
        <div>slug: {data.slug}</div>
        <div className="mt-1">id: {data.id}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Link
          href={`/super/organizations/${id}/jobs`}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
        >
          <div className="text-lg font-bold">🧾 求人</div>
          <div className="mt-1 text-sm text-white/70">その企業の求人を閲覧</div>
        </Link>

        <Link
          href={`/super/organizations/${id}/billing`}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
        >
          <div className="text-lg font-bold">💰 請求</div>
          <div className="mt-1 text-sm text-white/70">課金状態と請求見込み</div>
        </Link>

        <Link
          href={`/super/organizations/${id}/analytics`}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
        >
          <div className="text-lg font-bold">📊 応募分析</div>
          <div className="mt-1 text-sm text-white/70">応募数・求人別・ステータス別</div>
        </Link>
      </div>
    </div>
  );
}
