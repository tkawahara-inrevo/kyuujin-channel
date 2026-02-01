// app/api/admin/jobs/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminUserRow = {
  user_id: string;
  role: "admin" | "client_admin";
  organization_id: string | null;
};

const allowedStatus = ["draft", "published", "closed"] as const;
type JobStatus = (typeof allowedStatus)[number];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getNullableString(v: unknown): string | null {
  if (v === null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length ? t : null;
  }
  return null;
}
function parseJobStatus(v: unknown): JobStatus {
  const s = typeof v === "string" ? v.trim() : "";
  return (allowedStatus as readonly string[]).includes(s) ? (s as JobStatus) : "draft";
}

function isUuid(s: string): boolean {
  // UUIDの形式(8-4-4-4-12)だけ確認。version/variantは見ない
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function getAuthClientAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: adminUser } = await supabaseAdmin
    .from("admin_users")
    .select("user_id,role,organization_id")
    .eq("user_id", user.id)
    .maybeSingle<AdminUserRow>();

  if (!adminUser || adminUser.role !== "client_admin" || !adminUser.organization_id) {
    return { ok: false as const, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, organizationId: adminUser.organization_id };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: `Invalid id: ${id}` }, { status: 400 });
  }

  const auth = await getAuthClientAdmin();
  if (!auth.ok) return auth.res;

  const { data: job, error: jobErr } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 400 });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (job.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ job }, { status: 200 });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: `Invalid id: ${id}` }, { status: 400 });
  }

  const auth = await getAuthClientAdmin();
  if (!auth.ok) return auth.res;

  // 所有確認
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("id,organization_id")
    .eq("id", id)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRecord(raw)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const title = getNullableString(raw["title"]);
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const payload = {
    title,
    description: getNullableString(raw["description"]),
    location: getNullableString(raw["location"]),
    employment_type: getNullableString(raw["employment_type"]),
    salary: getNullableString(raw["salary"]),
    status: parseJobStatus(raw["status"]),
  };

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("jobs")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  return NextResponse.json({ job: updated }, { status: 200 });
}
