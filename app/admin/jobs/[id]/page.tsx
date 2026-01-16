// app/admin/jobs/[id]/page.tsx
import JobEditForm from "./_components/JobEditForm";

export default function AdminJobEditPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">求人を編集</h1>
        <p className="mt-2 text-sm text-slate-600">
          表示されている求人は「自社のものだけ」だよ🐰✨
        </p>
      </div>

      <div className="mt-6">
        <JobEditForm />
      </div>
    </main>
  );
}
