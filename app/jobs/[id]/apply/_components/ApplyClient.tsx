"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RecommendJob = {
  id: string;
  title: string;
  location: string | null;
  employment_type: string | null;
};

type Props = {
  jobId: string;
  recommended: RecommendJob[];
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

export default function ApplyClient({ jobId, recommended }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const recList = useMemo(() => recommended ?? [], [recommended]);

  function toggle(id: string) {
    setSelected((p) => ({ ...p, [id]: !p[id] }));
  }

  async function createSingle() {
    const res = await fetch("/api/public/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ job_id: jobId, applicant_message: message.trim() }),
    });
    const text = await res.text();
    const payload = safeJson(text);
    if (!res.ok) {
      if (res.status === 401) {
        router.push(`/auth/login?next=${encodeURIComponent(`/jobs/${jobId}/apply`)}`);
        return;
      }
      throw new Error(pickErrorMessage(payload, `応募に失敗しました（${res.status}）`));
    }
  }

  async function createBulk(jobIds: string[]) {
    const res = await fetch("/api/public/applications/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ job_ids: jobIds, applicant_message: message.trim() }),
    });
    const text = await res.text();
    const payload = safeJson(text);
    if (!res.ok) {
      if (res.status === 401) {
        router.push(`/auth/login?next=${encodeURIComponent(`/jobs/${jobId}/apply`)}`);
        return;
      }
      throw new Error(pickErrorMessage(payload, `応募に失敗しました（${res.status}）`));
    }
  }

  async function onOpenSuggest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError("志望動機を入れてね🥺");
      return;
    }

    if (recList.length === 0) {
      setSaving(true);
      try {
        await createSingle();
        router.push("/jobs?applied=1");
        router.refresh();
      } catch (e2) {
        setError(e2 instanceof Error ? e2.message : "応募に失敗しました");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSelected({});
    setOpen(true);
  }

  async function onApplyOnlyCurrent() {
    setError(null);
    setSaving(true);
    try {
      await createSingle();
      setOpen(false);
      router.push("/jobs?applied=1");
      router.refresh();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "応募に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function onApplyWithSelected() {
    setError(null);
    const picked = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const jobIds = Array.from(new Set([jobId, ...picked]));

    setSaving(true);
    try {
      await createBulk(jobIds);
      setOpen(false);
      router.push("/jobs?applied=1");
      router.refresh();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "応募に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form onSubmit={onOpenSuggest} className="mt-6 grid gap-3">
        <label className="grid gap-1">
          <div className="text-sm font-semibold">志望動機 *</div>
          <textarea
            rows={6}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="例：貴社の◯◯に共感し…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          disabled={saving}
          className="rounded-2xl bg-blue-600 py-3 text-center text-base font-extrabold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "送信中…" : "応募する"}
        </button>
      </form>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => (saving ? null : setOpen(false))}
          />

          <div className="relative z-10 w-[min(1000px,calc(100vw-32px))] max-h-[calc(100vh-32px)] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <div className="text-xl font-extrabold">他のおすすめ求人</div>
                <div className="mt-1 text-sm text-slate-600">
                  こちらの求人にも一括で応募できます（複数選択可）
                </div>
              </div>

              <button
                type="button"
                onClick={() => (saving ? null : setOpen(false))}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                aria-label="close"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[55vh] overflow-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-3">
                {recList.map((j) => (
                  <label
                    key={j.id}
                    className="block cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md"
                  >
                    <div className="h-28 bg-slate-100" />
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5"
                          checked={!!selected[j.id]}
                          onChange={() => toggle(j.id)}
                        />
                        <div>
                          <div className="font-extrabold leading-snug">{j.title}</div>
                          <div className="mt-2 grid gap-1 text-xs text-slate-600">
                            <div>📍 {j.location ?? "勤務地未設定"}</div>
                            <div>🧩 {j.employment_type ?? "雇用形態未設定"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                disabled={saving}
                onClick={onApplyWithSelected}
                className="w-full rounded-2xl bg-blue-600 py-4 text-center text-base font-extrabold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "応募処理中…" : "応募を完了する"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={onApplyOnlyCurrent}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white py-4 text-center text-sm font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                選択せずに応募する
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
