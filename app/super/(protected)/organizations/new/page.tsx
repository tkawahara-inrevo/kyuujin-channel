// app/super/(protected)/organizations/new/page.tsx
import NewOrganizationForm from "./_components/NewOrganizationForm";

export default function SuperNewOrganizationPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">🏢 企業を追加</h1>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
        運営（super_admin）だけが企業を追加できます。
      </div>
      <NewOrganizationForm />
    </div>
  );
}
