"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { id: string; status: string; onUpdated?: () => void };

const STATUSES = ["new", "in_progress", "done", "rejected", "archived"] as const;

function label(s: string) {
  switch (s) {
    case "new":
      return "未対応";
    case "in_progress":
      return "対応中";
    case "done":
      return "完了";
    case "rejected":
      return "見送り";
    case "archived":
      return "保管";
    default:
      return s;
  }
}

export default function StatusBadge({ id, status }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const update = async (next: (typeof STATUSES)[number]) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

if (!res.ok) {
  const text = await res.text(); // ✅ HTMLでも落ちない
  alert(`更新に失敗しました\n\n${text.slice(0, 200)}`);
  return;
}

      setOpen(false);

      // ✅ Server Component を再取得して最新表示にする
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        title="クリックでステータス変更"
      >
        {saving ? "更新中…" : `${label(status)} ▼`}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update(s)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                s === status ? "font-semibold" : ""
              }`}
            >
              {label(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
