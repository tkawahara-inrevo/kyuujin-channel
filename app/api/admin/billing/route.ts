import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminAccess } from "@/lib/auth/adminAccess";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

type BillingRow = {
  organization_id: string;
  plan: string;
  status: string;
  price_per_application: number | null;
  updated_at: string;
};

// Demo pricing (truthful because the number shown is computed using this exact table/logic)
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

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAdminAccess(user.id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const billing = await ensureBillingRow(access.organization_id);
  const start = monthStartIso();

  const { count: monthApps, error: cntErr } = await supabaseAdmin
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", access.organization_id)
    .gte("created_at", start);
  if (cntErr) return NextResponse.json({ error: cntErr.message }, { status: 500 });

  const unit = Number(
    billing.price_per_application ?? PLAN_DEFAULT_PRICE[String(billing.plan ?? "free").toLowerCase()] ?? 0
  );
  const apps = Number(monthApps ?? 0);
  const amount = apps * unit;

  return NextResponse.json({
    billing,
    computed: {
      month_start_iso: start,
      current_month_applications: apps,
      unit_price: unit,
      current_month_amount: amount,
    },
  });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAdminAccess(user.id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRecord(raw)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const plan = getString(raw["plan"]).trim().toLowerCase() || "free";
  const unit = PLAN_DEFAULT_PRICE[plan] ?? 0;

  const { data: updated, error } = await supabaseAdmin
    .from("organization_billing")
    .upsert({ organization_id: access.organization_id, plan, status: "active", price_per_application: unit, updated_at: new Date().toISOString() })
    .select("organization_id,plan,status,price_per_application,updated_at")
    .maybeSingle<BillingRow>();

  if (error || !updated) return NextResponse.json({ error: error?.message ?? "update failed" }, { status: 500 });
  return NextResponse.json({ billing: updated });
}
