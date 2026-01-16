// app/admin/jobs/new/page.tsx
import JobCreateForm from "./_components/JobCreateForm";

export default function AdminJobNewPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">新規求人を作成</h1>
        <p className="mt-2 text-sm text-slate-600">
          まずは jobs だけで「作成→公開→管理」の体験を完成させる
        </p>
      </div>

      <div className="mt-6">
        <JobCreateForm />
      </div>
    </main>
  );
}
