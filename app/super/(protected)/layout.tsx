// app/super/(protected)/layout.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSuperAccess } from "@/lib/auth/superAccess";
import SuperHeader from "../_components/SuperHeader";

export default async function SuperProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) redirect("/super/login");

  const access = await getSuperAccess(user.id);
  if (!access.ok) redirect("/super/login");

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <SuperHeader />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
