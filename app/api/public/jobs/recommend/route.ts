import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

type JobRecRow = {
  id: string;
  title: string;
  organization_id: string;
  // 画像はまだjobsに無い想定。後で追加できる
  organization: { name: string } | { name: string }[] | null;
};

function orgName(org: JobRecRow["organization"]): string {
  if (!org) return "";
  return Array.isArray(org) ? (org[0]?.name ?? "") : org.name;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const exclude = (url.searchParams.get("exclude_job_id") ?? "").trim();

  // 公開中求人から、今の求人を除いて上位を返す（おすすめロジックは後で差し替え可）
  let q = supabaseAdmin
    .from("jobs")
    .select(
      `
      id,
      title,
      organization_id,
      organization:organizations(name)
    `
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(12);

  if (exclude && isUuid(exclude)) {
    q = q.neq("id", exclude);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data ?? []) as JobRecRow[];

  const jobs = rows.map((r) => ({
    id: r.id,
    title: r.title,
    company_name: orgName(r.organization),
  }));

  return NextResponse.json({ jobs }, { status: 200 });
}
