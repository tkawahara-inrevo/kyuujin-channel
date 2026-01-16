// app/admin/login/page.tsx
import LoginForm from "./_components/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">管理者ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">
          ログインしたら、その会社の管理画面が開く
        </p>
      </div>

      <div className="mt-6">
        <LoginForm />
      </div>
    </main>
  );
}
