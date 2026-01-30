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

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

const ALLOWED_ROLES = new Set(["admin", "staff"]);

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await getAdminAccess(user?.id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const organization_id = access.organization_id;

  const { data, error } = await supabaseAdmin
    .from("organization_members")
    .select("id,organization_id,user_id,role,created_at")
    .eq("organization_id", organization_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await getAdminAccess(user?.id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // For now, only admin_users(client_admin) is treated as "org owner".
  if (access.role !== "client_admin") {
    return NextResponse.json({ error: "Only client_admin can modify team" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRecord(raw)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const user_id = getString(raw["user_id"]).trim();
  const role = getString(raw["role"]).trim().toLowerCase();
  if (!isUuid(user_id)) return NextResponse.json({ error: "user_id must be uuid" }, { status: 400 });
  if (!ALLOWED_ROLES.has(role)) return NextResponse.json({ error: "role must be admin|staff" }, { status: 400 });

  const organization_id = access.organization_id;

  const { data: inserted, error } = await supabaseAdmin
    .from("organization_members")
    .upsert({ organization_id, user_id, role })
    .select("id,organization_id,user_id,role,created_at")
    .maybeSingle();

  if (error || !inserted) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  return NextResponse.json({ ok: true, member: inserted }, { status: 201 });
}
