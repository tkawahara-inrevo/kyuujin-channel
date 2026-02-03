// app/admin/jobs/[id]/_components/JobEditForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type JobStatus = "draft" | "published" | "closed";

type JobApi = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  employment_type: string | null;
  salary: string | null;
  status: JobStatus;
};

type FormState = {
  title: string;
  description: string;
  location: string;
  employment_type: string;
  salary: string;
  status: JobStatus;
};

type ApiOk = { job: JobApi };
type ApiErr = { error?: string; message?: string };

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function pickErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const p = payload as ApiErr;
    if (typeof p.error === "string" && p.error.trim()) return p.error;
    if (typeof p.message === "string" && p.message.trim()) return p.message;
  }
  return fallback;
}

function coerceStatus(v: unknown): JobStatus {
  return v === "draft" || v === "published" || v === "closed" ? v : "draft";
}

export default function JobEditForm() {
  const router = useRouter();

  const params = useParams();
  const id = useMemo(() => {
    const raw = (params as Record<string, unknown> | null)?.["id"];
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
    return undefined;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    location: "",
    employment_type: "",
    salary: "",
    status: "draft",
  });

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  // 初期値ロード
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/admin/jobs/${id}`, { method: "GET" });
        const text = await res.text();
        const payload = safeJson(text);

        if (!res.ok) {
          throw new Error(
            pickErrorMessage(payload, `取得に失敗しました（status:${res.status}）`)
          );
        }

        const data = payload as ApiOk | null;
        const job = data?.job;

        if (!job) {
          throw new Error("求人データがありません");
        }

        if (cancelled) return;

        setForm({
          title: job.title ?? "",
          description: job.description ?? "",
          location: job.location ?? "",
          employment_type: job.employment_type ?? "",
          salary: job.salary ?? "",
          status: coerceStatus(job.status),
        });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "取得に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    setError(null);

    const title = form.title.trim();
    if (!title) {
      setError("求人タイトルは必須だよ🥺");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/jobs/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description: form.description.trim() || null,
          location: form.location.trim() || null,
          employment_type: form.employment_type.trim() || null,
          salary: form.salary.trim() || null,
          status: form.status,
        }),
      });

      const text = await res.text();
      const payload = safeJson(text);

      if (!res.ok) {
        throw new Error(
          pickErrorMessage(payload, `更新に失敗しました（status:${res.status}）`)
        );
      }

      // 保存後はダッシュボードへ戻す（検索状態は維持しない方針）
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (!id) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
        求人IDが取得できませんでした🥺（URLを確認してね）
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        読み込み中…
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4">
        <Field label="求人タイトル（必須）" required>
          <input
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="本文（任意）">
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="勤務地（任意）">
            <input
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="雇用形態（任意）">
            <input
              value={form.employment_type}
              onChange={(e) => setField("employment_type", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="給与（任意）">
            <input
              value={form.salary}
              onChange={(e) => setField("salary", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="ステータス">
            <select
              value={form.status}
              onChange={(e) => setField("status", coerceStatus(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="draft">下書き（draft）</option>
              <option value="published">公開（published）</option>
              <option value="closed">募集終了（closed）</option>
            </select>
          </Field>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存する"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
          >
            戻る
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <div className="text-sm font-semibold text-slate-900">
        {label} {required && <span className="text-rose-600">＊</span>}
      </div>
      {children}
    </label>
  );
}
