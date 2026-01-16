import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  // applications -> jobs / organizations をJOINして返す
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select(`
      id,
      applicant_name,
      applicant_email,
      status,
      created_at,
      job_id,
      organization_id,
      jobs ( title ),
      organizations ( name )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data });
}
