// lib/auth/superAccess.ts
import { supabaseAdmin } from "@/lib/supabase/admin";

export type SuperAccess =
  | { ok: true; role: "super_admin" }
  | { ok: false; reason: "not_logged_in" | "not_allowed" | "not_found" };

type AdminUserRow = { role: "super_admin" | "client_admin"; organization_id: string | null };

export async function getSuperAccess(userId: string | null | undefined): Promise<SuperAccess> {
  if (!userId) return { ok: false, reason: "not_logged_in" };

  const { data: adminUser, error } = await supabaseAdmin
    .from("admin_users")
    .select("role,organization_id")
    .eq("user_id", userId)
    .maybeSingle<AdminUserRow>();

  if (error || !adminUser) return { ok: false, reason: "not_found" };
  if (adminUser.role !== "super_admin") return { ok: false, reason: "not_allowed" };

  return { ok: true, role: "super_admin" };
}
