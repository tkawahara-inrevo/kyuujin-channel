// app/super/(protected)/organizations/[id]/billing/page.tsx
import { supabaseAdmin } from "@/lib/supabase/admin";
import PageHeader from "@/app/_components/PageHeader";

type BillingRow = {
  organization_id: string;
  plan: string;
  status: string;
  price_per_application: number | null;
  updated_at: string;
};

const PLAN_DEFAULT_PRICE: Record<string, number> = {
  free: 0,
  basic: 500,
  pro: 1000,
};

function monthStartIso(now = new Date()): string {
  const d = new Date(now);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function ensureBillingRow(organizationId: string): Promise<BillingRow> {
  const { data: existing } = await supabaseAdmin
    .from("organization_billing")
    .select("organization_id,plan,status,price_per_application,updated_at")
    .eq("organization_id", organizationId)
    .maybeSingle<BillingRow>();

  if (existing) return existing;

  const { data: inserted, error } = await supabaseAdmin
    .from("organization_billing")
    .insert({ organization_id: organizationId, plan: "free", status: "active", price_per_application: 0 })
    .select("organization_id,plan,status,price_per_application,updated_at")
    .maybeSingle<BillingRow>();

  if (error || !inserted) throw new Error(error?.message ?? "failed to create billing row");
  return inserted;
}

export default async function SuperOrgBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const billing = await ensureBillingRow(id);
  const start = monthStartIso();

  const { count } = await supabaseAdmin
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", id)
    .gte("created_at", start);

  const apps = Number(count ?? 0);
  const unit = Number(
    billing.price_per_application ?? PLAN_DEFAULT_PRICE[String(billing.plan ?? "free").toLowerCase()] ?? 0
  );
  const amount = apps * unit;

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
    { label: "請求" },
  ]}
  title="請求"
/>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
        <div>plan: <span className="font-bold text-white">{billing.plan}</span></div>
        <div className="mt-1">status: {billing.status}</div>
        <div className="mt-1">unit_price: {unit} 円 / 応募</div>
        <div className="mt-1">month_start: {start.slice(0, 10)}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/70">今月の応募数</div>
          <div className="mt-1 text-3xl font-extrabold">{apps}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/70">応募単価</div>
          <div className="mt-1 text-3xl font-extrabold">{unit}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/70">請求見込み</div>
          <div className="mt-1 text-3xl font-extrabold">{amount}</div>
        </div>
      </div>
    </div>
  );
}
