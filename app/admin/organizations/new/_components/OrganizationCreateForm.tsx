// app/admin/organizations/new/_components/OrganizationCreateForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type FormState = {
  name: string;
  slug: string;
  category: string;
  adminEmail: string;
  adminPassword: string;
};

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OrganizationCreateForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  //const [created, setCreated] = useState<{ orgName: string; adminEmail: string } | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    slug: "",
    category: "",
    adminEmail: "",
    adminPassword: "",
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.slug.trim().length > 0 &&
      form.adminEmail.trim().length > 0 &&
      form.adminPassword.length >= 8 &&
      !saving
    );
  }, [form, saving]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = form.name.trim();
    const slug = form.slug.trim();
    const adminEmail = form.adminEmail.trim();
    const adminPassword = form.adminPassword;

    if (!name) return setError("企業名は必須だよ🥺");
    if (!slug) return setError("slug は必須だよ🥺");
    if (!adminEmail) return setError("企業アドミンのメールは必須だよ🥺");
    if (adminPassword.length < 8) return setError("パスワードは8文字以上にしてね🥺");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          category: form.category.trim() || null,
          admin_email: adminEmail,
          admin_password: adminPassword,
        }),
      });

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

        router.push("/admin");
        router.refresh();
      // いったん /admin に戻さず、発行情報を見せてから戻れるようにする（事故防止💘）
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-900">
      <form onSubmit={onSubmit} className="grid gap-5">
        <div className="grid gap-4">
          <Field label="企業名（必須）" required>
            <input
              value={form.name}
              onChange={(e) => {
                const v = e.target.value;
                set("name", v);
                if (!form.slug.trim()) set("slug", slugify(v));
              }}
              placeholder="例）A株式会社"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>

          <Field label="slug（必須・ユニーク）" required>
            <input
              value={form.slug}
              onChange={(e) => set("slug", slugify(e.target.value))}
              placeholder="例）a-company"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
            <div className="mt-1 text-xs text-slate-600">
              ※ URL用の短いID（英数字と-だけ）になる
            </div>
          </Field>

          <Field label="カテゴリ（任意）">
            <input
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="例）IT / 飲食 / 建設"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">企業アドミン発行（同時作成）</div>
          <div className="mt-3 grid gap-4">
            <Field label="ログインID（メール形式）" required>
              <input
                value={form.adminEmail}
                onChange={(e) => set("adminEmail", e.target.value)}
                placeholder="例）a-admin@test.local"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
              <div className="mt-1 text-xs text-slate-600">
                ※ 実在しないメールでもOK（メール送信しない運用向け）
              </div>
            </Field>

            <Field label="初期パスワード（8文字以上）" required>
              <input
                type="text"
                value={form.adminPassword}
                onChange={(e) => set("adminPassword", e.target.value)}
                placeholder="例）TempPass123!"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </Field>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "作成中…" : "企業＋企業アドミンを作成"}
          </button>

          <button
            type="button"
            onClick={() => {
              router.push("/admin");
              router.refresh();
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            ダッシュボードへ戻る
          </button>
        </div>

        <div className="text-xs text-slate-600">
          ※ いまは体験優先：企業追加と同時に、企業アドミンでログインまで試せるようにするよ🫶
        </div>
      </form>
    </div>
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
