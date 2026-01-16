// app/api/admin/jobs/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedStatus = ["draft", "published", "closed"] as const;
type AllowedStatus = (typeof allowedStatus)[number];

type CreateJobRequest = {
  title: string;
  description?: string | null;
  location?: string | null;
  employment_type?: string | null;
  salary?: string | null;
  status?: AllowedStatus;

  // スーパーアドミンが使う場合のため（任意）
  organization_id?: string | null;
};

type AdminUserRow = {
  user_id: string;
  role: "admin" | "client_admin";
  organization_id: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function getNullableString(v: unknown): string | null {
  if (v === null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length ? t : null;
  }
  return null;
}

function getStatus(v: unknown): AllowedStatus {
  const s = getString(v).trim();
  return (allowedStatus as readonly string[]).includes(s) ? (s as AllowedStatus) : "draft";
}

export async function POST(req: Request) {
  // 0) ログイン必須（cookieセッション）
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isRecord(raw)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const body = raw as CreateJobRequest;

  const title = getString(body.title).trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // 2) admin_users で role / organization_id を特定（service roleでOK）
  const { data: adminUser, error: adminUserErr } = await supabaseAdmin
    .from("admin_users")
    .select("user_id,role,organization_id")
    .eq("user_id", user.id)
    .maybeSingle<AdminUserRow>();

  if (adminUserErr || !adminUser) {
    return NextResponse.json(
      { error: "This account is not registered as admin user" },
      { status: 403 }
    );
  }

  // 3) organization_id を決定
  let organization_id: string | null = null;

  if (adminUser.role === "client_admin") {
    // client_admin は自社固定（ここが今回の本丸）
    organization_id = adminUser.organization_id;
    if (!organization_id) {
      return NextResponse.json(
        { error: "organization_id is required for client_admin" },
        { status: 400 }
      );
    }
  } else {
    // admin（スーパー）は明示指定が必要（後でUIで企業選択を追加予定）
    organization_id = getNullableString(body.organization_id);
    if (!organization_id) {
      return NextResponse.json(
        { error: "organization_id is required for admin" },
        { status: 400 }
      );
    }
  }

  // 4) insert payload（organization_id を必ず入れる）
  const payload = {
    organization_id,
    title,
    description: getNullableString(body.description),
    location: getNullableString(body.location),
    employment_type: getNullableString(body.employment_type),
    salary: getNullableString(body.salary),
    status: getStatus(body.status),
  };

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .insert(payload)
    .select("id,organization_id,title,status,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ job: data }, { status: 201 });
}
