import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/auth/adminAccess";
import { getAdminAnalytics } from "@/lib/analytics/getAnalytics";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAdminAccess(user.id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const analytics = await getAdminAnalytics(access.organization_id);
  return NextResponse.json({ analytics });
}
