import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // ✅ ログアウト後はホームへ
  const url = new URL("/", req.url);
  const res = NextResponse.redirect(url, { status: 302 });
  res.headers.set("cache-control", "no-store");
  return res;
}

// Linkで叩かれた時の保険（GETでもホームへ）
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL("/", req.url);
  const res = NextResponse.redirect(url, { status: 302 });
  res.headers.set("cache-control", "no-store");
  return res;
}
