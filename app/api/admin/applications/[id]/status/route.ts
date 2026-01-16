// app/api/admin/applications/[id]/status/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminUserRowLite = {
  role: "admin" | "client_admin";
  organization_id: string | null;
};

const STATUSES = ["new", "in_progress", "done", "rejected", "archived"] as const;
type Status = (typeof STATUSES)[number];

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idRaw } = await params;
  const id = (idRaw ?? "").trim();

  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // 1) ログイン必須
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) client_admin のみ + org必須
  const { data: adminUser } = await supabaseAdmin
    .from("admin_users")
    .select("role,organization_id")
    .eq("user_id", user.id)
    .maybeSingle<AdminUserRowLite>();

  if (!adminUser || adminUser.role !== "client_admin" || !adminUser.organization_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3) body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = typeof body === "object" && body ? (body as Record<string, unknown>) : null;
  const status = typeof b?.status === "string" ? b.status : "";

  if (!STATUSES.includes(status as Status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // 4) 自社の応募だけ更新可（organization_id 縛り）
  const { error } = await supabaseAdmin
    .from("applications")
    .update({ status: status as Status })
    .eq("id", id)
    .eq("organization_id", adminUser.organization_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
