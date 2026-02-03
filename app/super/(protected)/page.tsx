// app/super/(protected)/page.tsx
import Link from "next/link";

export default function SuperHomePage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">運営ホーム</h1>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-white/80">やりたいこと：</div>
        <ul className="mt-3 list-disc pl-5 text-sm text-white/80">
          <li>企業情報の閲覧</li>
          <li>企業の求人閲覧</li>
          <li>請求・応募分析の閲覧</li>
        </ul>
<Link
  href="/super/organizations/new"
  className="inline-block rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
>
  🏢➕ 企業追加
</Link>
        <Link
          href="/super/organizations"
          className="mt-5 inline-block rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          🏢 企業一覧へ
        </Link>
      </div>
    </div>
  );
}
