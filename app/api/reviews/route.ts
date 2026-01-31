import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function getNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const organization_id = (url.searchParams.get("organization_id") ?? "").trim();
  if (!isUuid(organization_id)) {
    return NextResponse.json({ error: "organization_id is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("organization_reviews")
    .select("id,organization_id,applicant_user_id,rating,title,body,created_at")
    .eq("organization_id", organization_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
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

  const organization_id = getString(raw["organization_id"]).trim();
  const rating = getNumber(raw["rating"]);
  const title = getString(raw["title"]).trim() || null;
  const body = getString(raw["body"]).trim();

  if (!isUuid(organization_id)) return NextResponse.json({ error: "organization_id is required" }, { status: 400 });
  if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: "rating must be 1..5" }, { status: 400 });
  if (!body) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const { data: inserted, error } = await supabaseAdmin
    .from("organization_reviews")
    .insert({ organization_id, applicant_user_id: user.id, rating, title, body })
    .select("id,organization_id,applicant_user_id,rating,title,body,created_at")
    .maybeSingle();

  if (error || !inserted) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  return NextResponse.json({ ok: true, review: inserted }, { status: 201 });
}
