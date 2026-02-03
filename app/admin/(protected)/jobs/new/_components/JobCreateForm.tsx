// app/admin/jobs/new/_components/JobCreateForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FormState = {
  title: string;
  description: string;
  location: string;
  employment_type: string;
  salary: string;
  status: "draft" | "published" | "closed";
};

export default function JobCreateForm() {
  const router = useRouter();
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

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const title = form.title.trim();
    if (!title) {
      setError("求人タイトルは必須だよ🥺");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
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

      // HTML返っても落ちないように保険（いままでの経験を活かすやつ🫶）
      const ct = res.headers.get("content-type") ?? "";
      const text = await res.text();
      const payload = ct.includes("application/json") ? safeJson(text) : null;

      if (!res.ok) {
        const msg =
          (payload && (payload.error || payload.message)) ||
          text ||
          `作成に失敗しました（status:${res.status}）`;
        throw new Error(msg);
      }

      // 成功：まずは /admin に戻して「最近の求人」に出た！を体験させる✨
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4">
        <Field label="求人タイトル（必須）" required>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="例）Webエンジニア（Next.js）"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="本文（任意）">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="仕事内容、応募条件、歓迎スキルなど"
            rows={6}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="勤務地（任意）">
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="例）東京都 / リモート可"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="雇用形態（任意）">
            <input
              value={form.employment_type}
              onChange={(e) => set("employment_type", e.target.value)}
              placeholder="例）正社員 / 業務委託"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="給与（任意）">
            <input
              value={form.salary}
              onChange={(e) => set("salary", e.target.value)}
              placeholder="例）年収 500〜800万"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="ステータス">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as FormState["status"])}
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
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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

        <div className="text-xs text-slate-500">
          ※ まずは体験優先：入力は最小（タイトル必須）でOK
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

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
