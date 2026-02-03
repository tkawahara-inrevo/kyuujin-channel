// app/admin/(protected)/layout.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/auth/adminAccess";
import AdminHeader from "../_components/AdminHeader";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) redirect("/admin/login");

  const access = await getAdminAccess(user.id);
  if (!access.ok) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-[#EFF1F7] text-slate-900">
      <AdminHeader />
      {children}
    </div>
  );
}
