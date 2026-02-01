import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isUuidLoose } from "@/lib/validators/uuid";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const { job_id } = await params;

  if (!job_id || !isUuidLoose(job_id)){
    return NextResponse.json({ error: "job_id is invalid" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabaseAdmin
    .from("favorites")
    .delete()
    .eq("applicant_user_id", user.id)
    .eq("job_id", job_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
