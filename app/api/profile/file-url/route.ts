import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Kind = "resume" | "cv";
function isKind(v: string): v is Kind {
  return v === "resume" || v === "cv";
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kindRaw = String(searchParams.get("kind") ?? "");
  if (!isKind(kindRaw)) {
    return NextResponse.json({ error: "kind must be resume or cv" }, { status: 400 });
  }

  const { data: applicant, error } = await supabaseAdmin
    .from("applicants")
    .select("resume_path,cv_path")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!applicant) return NextResponse.json({ error: "Applicant not found" }, { status: 404 });

  const path = kindRaw === "resume" ? applicant.resume_path : applicant.cv_path;
  if (!path) return NextResponse.json({ error: "File not uploaded" }, { status: 404 });

  const bucket = "applicant-files";
  const expiresIn = 60 * 10; // 10分

  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (signErr) return NextResponse.json({ error: signErr.message }, { status: 400 });

  return NextResponse.json({ url: signed.signedUrl }, { status: 200 });
}
