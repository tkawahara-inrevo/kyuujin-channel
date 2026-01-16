// app/api/public/applications/bulk/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function getBool(v: unknown): boolean {
  return v === true;
}
function getStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

type ApplicantRow = {
  id: string;
  display_name: string;
  email: string;
  phone: string | null;
  resume_path: string | null;
  cv_path: string | null;
};

type JobRow = {
  id: string;
  organization_id: string;
  status: "draft" | "published" | "closed";
};

export async function POST(req: Request) {
  // ✅ ログイン必須
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRecord(raw)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const job_ids = getStringArray(raw["job_ids"])
    .map((s) => s.trim())
    .filter((s) => s && isUuid(s));

  const applicant_message = getString(raw["applicant_message"]).trim();
  const include_documents = getBool(raw["include_documents"]);

  if (job_ids.length === 0) return NextResponse.json({ error: "job_ids is required" }, { status: 400 });
  if (!applicant_message) return NextResponse.json({ error: "applicant_message is required" }, { status: 400 });

  // ✅ 応募者プロフィール（書類path含む）
  const { data: applicant, error: appErr } = await supabaseAdmin
    .from("applicants")
    .select("id,display_name,email,phone,resume_path,cv_path")
    .eq("id", user.id)
    .maybeSingle<ApplicantRow>();

  if (appErr) return NextResponse.json({ error: appErr.message }, { status: 400 });
  if (!applicant) return NextResponse.json({ error: "Applicant profile not found" }, { status: 400 });

  if (include_documents) {
    const hasAny = !!(applicant.resume_path || applicant.cv_path);
    if (!hasAny) {
      return NextResponse.json(
        { error: "書類が未アップロードです。プロフィールから履歴書/職務経歴書をアップロードしてね🥺" },
        { status: 400 }
      );
    }
  }

  // ✅ 対象求人をまとめて取得（publishedのみ）
  const { data: jobs, error: jobErr } = await supabaseAdmin
    .from("jobs")
    .select("id,organization_id,status")
    .in("id", job_ids);

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 400 });

  const rows = ((jobs ?? []) as JobRow[])
    .filter((j) => j.status === "published")
    .map((j) => ({
      job_id: j.id,
      organization_id: j.organization_id,

      applicant_user_id: user.id,
      applicant_display_name: applicant.display_name,
      applicant_name: applicant.display_name,
      applicant_email: applicant.email,
      applicant_phone: applicant.phone,
      applicant_message,
      status: "new",
      memo: null as string | null,

      include_documents,
      resume_path: include_documents ? applicant.resume_path : null,
      cv_path: include_documents ? applicant.cv_path : null,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "No acceptable jobs" }, { status: 400 });
  }

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("applications")
    .insert(rows)
    .select("id,job_id");

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  return NextResponse.json({ created: inserted ?? [] }, { status: 201 });
}
