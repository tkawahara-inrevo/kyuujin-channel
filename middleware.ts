// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin/login は通す（ログインページ自体が弾かれちゃうのを防ぐ）
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  // /admin 配下だけ守る
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // ★ ここが肝：cookie をレスポンスに載せるために res を作る
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  // 未ログインなら /admin/login へ
  if (!data.user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname); // ついでに戻り先を持たせる（便利）
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
