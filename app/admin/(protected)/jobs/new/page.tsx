// app/admin/jobs/new/page.tsx
import JobCreateForm from "./_components/JobCreateForm";
import PageHeader from "@/app/_components/PageHeader";

export default function AdminJobNewPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
<PageHeader
  variant="admin"
  crumbs={[
    { label: "ダッシュボード", href: "/admin" },
    { label: "求人作成" },
  ]}
  title="求人作成"
  subtitle="まずは jobs だけで「作成→公開→管理」の体験を完成させる"
/>
      </div>
      <div className="mt-6">
        <JobCreateForm />
      </div>
    </main>
  );
}
