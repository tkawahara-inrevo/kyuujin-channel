// app/super/login/page.tsx
import LoginForm from "./_components/LoginForm";

export default function SuperLoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">運営ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">ログインしたら運営コンソールへ移動するよ</p>
      </div>

      <div className="mt-6">
        <LoginForm />
      </div>
    </main>
  );
}
