// app/admin/organizations/new/page.tsx
import OrganizationCreateForm from "./_components/OrganizationCreateForm";

export default function AdminOrganizationNewPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">企業を追加</h1>
        <p className="mt-2 text-sm text-slate-600">
          スーパーアドミンが企業を登録する画面だよ🐰✨
        </p>
      </div>

      <div className="mt-6">
        <OrganizationCreateForm />
      </div>
    </main>
  );
}
