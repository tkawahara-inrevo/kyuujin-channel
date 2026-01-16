// app/api/public/applications/route.ts
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
  // ✅ ログイン必須（cookieセッション）
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

  const job_id = getString(raw["job_id"]).trim();
  const applicant_message = getString(raw["applicant_message"]).trim();
  const include_documents = getBool(raw["include_documents"]);

  if (!job_id || !isUuid(job_id)) {
    return NextResponse.json({ error: "job_id is invalid" }, { status: 400 });
  }
  if (!applicant_message) {
    return NextResponse.json({ error: "applicant_message is required" }, { status: 400 });
  }

  // ✅ 応募者プロフィール（applicants）取得（書類path含む）
  const { data: applicant, error: appErr } = await supabaseAdmin
    .from("applicants")
    .select("id,display_name,email,phone,resume_path,cv_path")
    .eq("id", user.id)
    .maybeSingle<ApplicantRow>();

  if (appErr) return NextResponse.json({ error: appErr.message }, { status: 400 });
  if (!applicant) return NextResponse.json({ error: "Applicant profile not found" }, { status: 400 });

  // ✅ 書類同封チェックONなら、どちらかの書類が必要（どっちでもOK）
  if (include_documents) {
    const hasAny = !!(applicant.resume_path || applicant.cv_path);
    if (!hasAny) {
      return NextResponse.json(
        { error: "書類が未アップロードです。プロフィールから履歴書/職務経歴書をアップロードしてね🥺" },
        { status: 400 }
      );
    }
  }

  // ✅ job を引いて organization_id を補完（公開中のみ応募OK）
  const { data: job, error: jobErr } = await supabaseAdmin
    .from("jobs")
    .select("id,organization_id,status")
    .eq("id", job_id)
    .maybeSingle<JobRow>();

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 400 });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "published") {
    return NextResponse.json({ error: "This job is not accepting applications" }, { status: 400 });
  }

  // ✅ applications へ保存（スナップショット＋書類も必要ならコピー）
  const payload = {
    job_id,
    organization_id: job.organization_id,
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
  };

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("applications")
    .insert(payload)
    .select("id")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  return NextResponse.json({ application_id: inserted.id }, { status: 201 });
}
