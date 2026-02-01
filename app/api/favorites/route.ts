import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isUuidLoose } from "@/lib/validators/uuid";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRecord(raw)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const job_id = getString(raw["job_id"]).trim();
  if (!job_id || !isUuidLoose(job_id)) {
    return NextResponse.json({ error: "job_id is invalid" }, { status: 400 });
  }

  // ✅ upsert（重複保存してもOKにする）
  const { error } = await supabaseAdmin
    .from("favorites")
    .upsert(
      { applicant_user_id: user.id, job_id },
      { onConflict: "applicant_user_id,job_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
