"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  jobId: string;
  initialIsFavorite: boolean;
};

export default function FavoriteButton({ jobId, initialIsFavorite }: Props) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });

      if (res.status === 401) {
        router.push(`/auth/login?next=${encodeURIComponent(`/jobs/${jobId}`)}`);
        return;
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "failed");
      }

      setIsFavorite(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      const res = await fetch(`/api/favorites/${jobId}`, { method: "DELETE" });

      if (res.status === 401) {
        router.push(`/auth/login?next=${encodeURIComponent(`/jobs/${jobId}`)}`);
        return;
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "failed");
      }

      setIsFavorite(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      disabled={saving}
      onClick={() => (isFavorite ? remove() : save())}
      className={`mt-3 w-full rounded-2xl border px-4 py-3 text-center text-sm font-extrabold disabled:opacity-50 ${
        isFavorite
          ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {saving ? "保存中…" : isFavorite ? "❤️ 保存済み" : "🤍 気になるに保存"}
    </button>
  );
}
