import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function getNullableString(v: unknown): string | null {
  if (v === null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length ? t : null;
  }
  return null;
}
function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRecord(raw)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const email = getString(raw["email"]).trim();
  const password = getString(raw["password"]).trim();
  const display_name = getString(raw["display_name"]).trim();
  const phone = getNullableString(raw["phone"]);

  if (!email || !isEmail(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 chars" }, { status: 400 });
  if (!display_name) return NextResponse.json({ error: "display_name is required" }, { status: 400 });

  // cookieセッションを作れる supabase client（anon）
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const userId = data.user?.id;
  if (!userId) {
    // email確認が必須な設定等で user が取れないケースに備える
    return NextResponse.json({ error: "User was not created" }, { status: 400 });
  }

  // applicants作成（service roleでRLS回避）
  const { error: insErr } = await supabaseAdmin.from("applicants").insert({
    id: userId,
    display_name,
    email,
    phone,
  });

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
