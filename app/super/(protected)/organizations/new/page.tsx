// app/super/(protected)/organizations/new/page.tsx
import NewOrganizationForm from "./_components/NewOrganizationForm";
import PageHeader from "@/app/_components/PageHeader";

export default function SuperNewOrganizationPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
  variant="super"
  crumbs={[
    { label: "運営", href: "/super" },
    { label: "企業一覧", href: "/super/organizations" },
    { label: "企業追加" },
  ]}
  title="企業追加"
  subtitle="運営（super_admin）だけが企業を追加できます。"
  backFallbackHref="/super/organizations"
/>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
        運営（super_admin）だけが企業を追加できます。
      </div>
      <NewOrganizationForm />
    </div>
  );
}
