// app/api/admin/organizations/route.ts
import { NextResponse } from "next/server";
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
function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRecord(raw)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // org
  const name = getString(raw.name).trim();
  const slug = normalizeSlug(getString(raw.slug));
  const category = getNullableString(raw.category);

  // admin (client_admin)
  const adminEmail = getString(raw.admin_email).trim();
  const adminPassword = getString(raw.admin_password);

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  if (!adminEmail) return NextResponse.json({ error: "admin_email is required" }, { status: 400 });
  if (adminPassword.length < 8) {
    return NextResponse.json({ error: "admin_password must be at least 8 chars" }, { status: 400 });
  }

  // 1) org作成
  const orgRes = await supabaseAdmin
    .from("organizations")
    .insert({ name, slug, category })
    .select("id,name,slug")
    .single();

  if (orgRes.error) {
    return NextResponse.json({ error: orgRes.error.message }, { status: 400 });
  }

  const org = orgRes.data;

  // 2) Authユーザー作成（メール送信しない：passwordをセット）
  // NOTE: supabaseAdmin は service role で初期化されている必要あり
  const createdUser = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true, // テスト運用なので確定扱い
  });

  if (createdUser.error || !createdUser.data.user) {
    // orgだけ作れてuserが作れないと中途半端なので、orgを消して整合性維持
    await supabaseAdmin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json(
      { error: createdUser.error?.message ?? "Failed to create auth user" },
      { status: 400 }
    );
  }

  const userId = createdUser.data.user.id;

  // 3) admin_usersに紐付け
  const adminRes = await supabaseAdmin
    .from("admin_users")
    .insert({
      user_id: userId,
      role: "client_admin",
      organization_id: org.id,
    })
    .select("user_id,role,organization_id")
    .single();

  if (adminRes.error) {
    // admin_users作成に失敗したら、authユーザー＆orgも消して戻す
    await supabaseAdmin.auth.admin.deleteUser(userId);
    await supabaseAdmin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json({ error: adminRes.error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      organization: org,
      created_admin_user: { email: adminEmail, role: "client_admin", organization_id: org.id },
    },
    { status: 201 }
  );
}
