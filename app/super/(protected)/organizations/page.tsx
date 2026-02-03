// app/super/(protected)/organizations/page.tsx
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import PageHeader from "@/app/_components/PageHeader";

type OrgRow = { id: string; name: string; slug: string; created_at: string };

export default async function SuperOrganizationsPage() {
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("id,name,slug,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const list = (data ?? []) as OrgRow[];

  return (
    <div className="grid gap-4">
      <PageHeader
  variant="super"
  crumbs={[
    { label: "運営", href: "/super" },
    { label: "企業一覧" },
  ]}
  title="企業一覧"
  actions={
    <Link
      href="/super/organizations/new"
      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black"
    >
      🏢➕ 企業追加
    </Link>
  }
/>
      <div className="rounded-2xl border border-white/10 bg-white/5">
        <div className="divide-y divide-white/10">
          {list.map((o) => (
            <Link
              key={o.id}
              href={`/super/organizations/${o.id}`}
              className="block px-5 py-4 hover:bg-white/5"
            >
              <div className="font-semibold">{o.name}</div>
              <div className="mt-1 text-xs text-white/70">
                slug: {o.slug} / id: {o.id}
              </div>
            </Link>
          ))}
          {list.length === 0 && (
            <div className="px-5 py-6 text-sm text-white/70">企業がまだないよ🥺</div>
          )}
        </div>
      </div>
    </div>
  );
}
