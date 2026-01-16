// app/jobs/[id]/apply/_components/OtherJobsModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type JobRec = {
  id: string;
  title: string;
  company_name: string;
};

type Props = {
  open: boolean;
  excludeJobId: string;
  applicantMessage: string;
  includeDocuments: boolean; // ✅ 追加
  onClose: () => void;
  onDone: () => void;
};

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function pickErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const p = payload as { error?: unknown; message?: unknown };
    if (typeof p.error === "string" && p.error.trim()) return p.error;
    if (typeof p.message === "string" && p.message.trim()) return p.message;
  }
  return fallback;
}

export default function OtherJobsModal({
  open,
  excludeJobId,
  applicantMessage,
  includeDocuments,
  onClose,
  onDone,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<JobRec[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => jobs.filter((j) => selected[j.id]).map((j) => j.id),
    [jobs, selected]
  );

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/public/jobs/recommend?exclude_job_id=${encodeURIComponent(excludeJobId)}`
        );
        const text = await res.text();
        const payload = safeJson(text);

        if (!res.ok) {
          throw new Error(pickErrorMessage(payload, `取得に失敗しました（status:${res.status}）`));
        }

        const p = payload as { jobs?: unknown };
        const arr = Array.isArray(p.jobs) ? p.jobs : [];
        const list: JobRec[] = arr
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const o = x as { id?: unknown; title?: unknown; company_name?: unknown };
            if (typeof o.id !== "string" || typeof o.title !== "string") return null;
            return {
              id: o.id,
              title: o.title,
              company_name: typeof o.company_name === "string" ? o.company_name : "",
            };
          })
          .filter((v): v is JobRec => v !== null);

        setJobs(list);
        setSelected({});
      } catch (e) {
        setError(e instanceof Error ? e.message : "取得に失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, excludeJobId]);

  function toggle(id: string) {
    setSelected((p) => ({ ...p, [id]: !p[id] }));
  }

  async function submitSelected() {
    setError(null);

    // 選択ゼロならそのまま完了
    if (selectedIds.length === 0) {
      onClose();
      onDone();
      return;
    }

    const msg = applicantMessage.trim();
    if (!msg) {
      setError("志望動機が空だよ🥺（戻って入力してね）");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/public/applications/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          job_ids: selectedIds,
          applicant_message: msg,
          include_documents: includeDocuments, // ✅ 追加
        }),
      });

      const text = await res.text();
      const payload = safeJson(text);

      if (!res.ok) {
        throw new Error(pickErrorMessage(payload, `応募に失敗しました（status:${res.status}）`));
      }

      onClose();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "応募に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <div className="text-2xl font-extrabold">他のおすすめ求人</div>
            <div className="mt-1 text-sm text-slate-600">こちらの求人にも一括で応募できます（複数選択可）</div>
            {includeDocuments ? (
              <div className="mt-2 text-sm font-semibold text-rose-600">
                📎 書類同封：ON（プロフィールの書類を同封します）
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-auto p-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">読み込み中…</div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">おすすめ求人がありません🥺</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {jobs.map((j) => (
                <div key={j.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!selected[j.id]}
                      onChange={() => toggle(j.id)}
                      className="h-5 w-5"
                    />
                    <div>
                      <div className="font-bold">{j.title}</div>
                      <div className="text-sm text-slate-600">{j.company_name}</div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-200 p-6">
          <button
            type="button"
            disabled={saving}
            onClick={submitSelected}
            className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-extrabold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "送信中…" : "応募を完了する"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => {
              onClose();
              onDone();
            }}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white py-3 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            選択せずに完了
          </button>
        </div>
      </div>
    </div>
  );
}
