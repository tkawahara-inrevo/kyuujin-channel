// app/admin/_components/AdminShell.tsx
"use client";

import { usePathname } from "next/navigation";
import AdminHeader from "./AdminHeader";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideHeader =
    pathname === "/admin/login" || pathname.startsWith("/admin/login/");

  return (
    <div className="min-h-screen bg-[#EFF1F7] text-slate-900">
      {!hideHeader && <AdminHeader />}
      {children}
    </div>
  );
}
