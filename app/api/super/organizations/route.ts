// app/api/super/organizations/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminUserRow = {
  user_id: string;
  role: "super_admin" | "client_admin";
  organization_id: string | null;
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });

  const { data: au } = await supabaseAdmin
    .from("admin_users")
    .select("user_id,role,organization_id")
    .eq("user_id", user.id)
    .maybeSingle<AdminUserRow>();

  if (!au || au.role !== "super_admin") {
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const slug = String(body?.slug ?? "").trim();
  const category = String(body?.category ?? "").trim();

  if (!name || !slug || !category) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { data: org, error } = await supabaseAdmin
    .from("organizations")
    .insert({ name, slug, category })
    .select("id,name,slug,created_at")
    .maybeSingle();

  if (error || !org) {
    return NextResponse.json({ error: error?.message ?? "insert_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, organization: org });
}
