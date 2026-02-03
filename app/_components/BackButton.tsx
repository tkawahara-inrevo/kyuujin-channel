// app/_components/BackButton.tsx
"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  label = "戻る",
  variant = "admin",
}: {
  label?: string;
  variant?: "admin" | "super";
}) {
  const router = useRouter();

  const cls =
    variant === "super"
      ? "rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
      : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={cls}
      title="前の画面に戻る"
    >
      ← {label}
    </button>
  );
}
