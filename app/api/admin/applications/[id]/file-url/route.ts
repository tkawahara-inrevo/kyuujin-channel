// app/api/admin/applications/[id]/file-url/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isUuidLoose } from "@/lib/validators/uuid";

type AdminUserRowLite = {
  role: "admin" | "client_admin";
  organization_id: string | null;
};

const BUCKET = "applicant-files";
const EXPIRES_IN = 60 * 10; // 10分

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idRaw } = await params;
  const id = (idRaw ?? "").trim();

  if (!id || !isUuidLoose(id)){
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const kind = (url.searchParams.get("kind") ?? "").trim();

  if (kind !== "resume" && kind !== "cv") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
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

  const organizationId = adminUser.organization_id;

  // 3) 自社応募だけ参照できるように organization_id で縛る
  const { data: app, error: appErr } = await supabaseAdmin
    .from("applications")
    .select("id, organization_id, include_documents, resume_path, cv_path")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (appErr || !app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const path =
    kind === "resume"
      ? (app.resume_path as string | null)
      : (app.cv_path as string | null);

  // include_documents=true の応募だけ「添付あり」想定（ただし念のため path で最終判定）
  if (!app.include_documents || !path) {
    return NextResponse.json({ error: "File not attached" }, { status: 404 });
  }

  // 4) signed URL 発行
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, EXPIRES_IN);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Failed to sign url" }, { status: 500 });
  }

  // 5) 302 リダイレクト（UI側にJSいらない！）
  return NextResponse.redirect(data.signedUrl, { status: 302 });
}
