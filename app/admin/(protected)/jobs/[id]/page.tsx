// app/admin/jobs/[id]/page.tsx
import JobEditForm from "./_components/JobEditForm";
import PageHeader from "@/app/_components/PageHeader";

export default function AdminJobEditPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
<PageHeader
  variant="admin"
  crumbs={[
    { label: "ダッシュボード", href: "/admin" },
    { label: "求人編集" },
  ]}
  title="求人編集"
/>

      </div>

      <div className="mt-6">
        <JobEditForm />
      </div>
    </main>
  );
}
