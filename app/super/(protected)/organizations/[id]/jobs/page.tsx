// app/super/(protected)/organizations/[id]/jobs/page.tsx
import { supabaseAdmin } from "@/lib/supabase/admin";
import PageHeader from "@/app/_components/PageHeader";

type JobRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export default async function SuperOrgJobsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data } = await supabaseAdmin
    .from("jobs")
    .select("id,title,status,created_at")
    .eq("organization_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  const list = (data ?? []) as JobRow[];

  const { data: org } = await supabaseAdmin
  .from("organizations")
  .select("id,name")
  .eq("id", id)
  .maybeSingle();

const orgName = org?.name ?? "企業";

  return (
    <div className="grid gap-4">
<PageHeader
  variant="super"
  crumbs={[
    { label: "運営", href: "/super" },
    { label: "企業一覧", href: "/super/organizations" },
    { label: orgName, href: `/super/organizations/${id}` },
    { label: "求人" },
  ]}
  title="求人"
/>
      <div className="rounded-2xl border border-white/10 bg-white/5">
        <div className="divide-y divide-white/10">
          {list.map((j) => (
            <div key={j.id} className="px-5 py-4">
              <div className="font-semibold">{j.title}</div>
              <div className="mt-1 text-xs text-white/70">
                status: {j.status} / id: {j.id}
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="px-5 py-6 text-sm text-white/70">求人がまだないよ🥺</div>
          )}
        </div>
      </div>
    </div>
  );
}
