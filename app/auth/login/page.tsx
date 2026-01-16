// app/auth/login/page.tsx
import LoginForm from "./_components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = (sp.next ?? "").trim();

  return (
    <main className="mx-auto max-w-md px-6 py-12 text-slate-900">
      <h1 className="text-3xl font-extrabold">ログイン</h1>
      <p className="mt-2 text-sm text-slate-600">ログインして応募できるようにするよ🫶</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <LoginForm nextPath={next} />
      </div>
    </main>
  );
}
