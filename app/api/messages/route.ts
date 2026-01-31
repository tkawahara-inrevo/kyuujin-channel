import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminAccess } from "@/lib/auth/adminAccess";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

type ApplicationRow = {
  id: string;
  organization_id: string;
  applicant_user_id: string;
};

type ConversationRow = {
  id: string;
  application_id: string;
  organization_id: string;
  applicant_user_id: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const application_id = (url.searchParams.get("application_id") ?? "").trim();
  if (!isUuid(application_id)) {
    return NextResponse.json({ error: "application_id is required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load application (service role) then authorize at the API layer.
  const { data: app, error: appErr } = await supabaseAdmin
    .from("applications")
    .select("id,organization_id,applicant_user_id")
    .eq("id", application_id)
    .maybeSingle<ApplicationRow>();

  if (appErr || !app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const adminAccess = await getAdminAccess(user.id);
  const isCompany = adminAccess.ok && adminAccess.organization_id === app.organization_id;
  const isApplicant = app.applicant_user_id === user.id;
  if (!isCompany && !isApplicant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

const { data, error: convErr } = await supabaseAdmin
  .from("conversations")
  .select("id,application_id,organization_id,applicant_user_id")
  .eq("application_id", application_id)
  .maybeSingle<ConversationRow>();

let conv = data; // ← ここで let にする

  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });

  if (!conv) {
    const { data: created, error: cErr } = await supabaseAdmin
      .from("conversations")
      .insert({
        application_id,
        organization_id: app.organization_id,
        applicant_user_id: app.applicant_user_id,
      })
      .select("id,application_id,organization_id,applicant_user_id")
      .maybeSingle<ConversationRow>();

    if (cErr || !created) return NextResponse.json({ error: cErr?.message ?? "create failed" }, { status: 500 });
    conv = created;
  }

  const { data: messages, error: mErr } = await supabaseAdmin
    .from("messages")
    .select("id,conversation_id,sender_type,sender_user_id,body,created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true });

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  return NextResponse.json({ conversation: conv, messages: messages ?? [] });
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

  const application_id = getString(raw["application_id"]).trim();
  const body = getString(raw["body"]).trim();
  if (!isUuid(application_id)) return NextResponse.json({ error: "application_id is required" }, { status: 400 });
  if (!body) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const { data: app, error: appErr } = await supabaseAdmin
    .from("applications")
    .select("id,organization_id,applicant_user_id")
    .eq("id", application_id)
    .maybeSingle<ApplicationRow>();
  if (appErr || !app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const adminAccess = await getAdminAccess(user.id);
  const isCompany = adminAccess.ok && adminAccess.organization_id === app.organization_id;
  const isApplicant = app.applicant_user_id === user.id;
  if (!isCompany && !isApplicant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ensure conversation exists
  let { data: conv } = await supabaseAdmin
    .from("conversations")
    .select("id,application_id,organization_id,applicant_user_id")
    .eq("application_id", application_id)
    .maybeSingle<ConversationRow>();

  if (!conv) {
    const { data: created, error: cErr } = await supabaseAdmin
      .from("conversations")
      .insert({
        application_id,
        organization_id: app.organization_id,
        applicant_user_id: app.applicant_user_id,
      })
      .select("id,application_id,organization_id,applicant_user_id")
      .maybeSingle<ConversationRow>();
    if (cErr || !created) return NextResponse.json({ error: cErr?.message ?? "create failed" }, { status: 500 });
    conv = created;
  }

  const sender_type = isCompany ? "company" : "applicant";

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conv.id,
      sender_type,
      sender_user_id: user.id,
      body,
    })
    .select("id,conversation_id,sender_type,sender_user_id,body,created_at")
    .maybeSingle();

  if (insErr || !inserted) return NextResponse.json({ error: insErr?.message ?? "insert failed" }, { status: 500 });

  return NextResponse.json({ ok: true, message: inserted }, { status: 201 });
}
