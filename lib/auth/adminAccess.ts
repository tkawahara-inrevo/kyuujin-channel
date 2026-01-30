// lib/auth/adminAccess.ts
// Lightweight admin access helper.
//
// Existing: admin_users (role: client_admin)
// Optional extension: organization_members (role: admin/staff)

import { supabaseAdmin } from "@/lib/supabase/admin";

export type AdminAccess =
  | { ok: true; organization_id: string; role: "client_admin" | "client_staff" }
  | { ok: false; reason: "not_logged_in" | "not_allowed" | "not_found" };

type AdminUserRow = { role: "admin" | "client_admin"; organization_id: string | null };
type OrgMemberRow = { organization_id: string; role: string };

export async function getAdminAccess(userId: string | null | undefined): Promise<AdminAccess> {
  if (!userId) return { ok: false, reason: "not_logged_in" };

  // 1) Existing: admin_users
  const { data: adminUser, error: adminUserErr } = await supabaseAdmin
    .from("admin_users")
    .select("role,organization_id")
    .eq("user_id", userId)
    .maybeSingle<AdminUserRow>();

  if (!adminUserErr && adminUser && adminUser.role === "client_admin" && adminUser.organization_id) {
    return { ok: true, organization_id: adminUser.organization_id, role: "client_admin" };
  }

  // 2) Optional: organization_members
  const { data: member, error: memberErr } = await supabaseAdmin
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .maybeSingle<OrgMemberRow>();

  if (memberErr || !member?.organization_id) return { ok: false, reason: "not_allowed" };

  const role = String(member.role || "").toLowerCase();
  if (role === "admin" || role === "staff") {
    return { ok: true, organization_id: member.organization_id, role: "client_staff" };
  }

  return { ok: false, reason: "not_allowed" };
}
