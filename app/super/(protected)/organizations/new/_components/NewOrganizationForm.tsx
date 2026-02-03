// app/super/(protected)/organizations/new/_components/NewOrganizationForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !slug.trim() || !category.trim()) {
      setError("name / slug / category を全部入れてね🥺");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/super/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          category: category.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `failed (${res.status})`);

      const id = data?.organization?.id;
      if (!id) throw new Error("created but no id");

      router.push(`/super/organizations/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="grid gap-4">
        <label className="grid gap-1">
          <div className="text-sm font-semibold text-white">会社名</div>
          <input
            className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例）かやちゃん株式会社"
          />
        </label>

        <label className="grid gap-1">
          <div className="text-sm font-semibold text-white">slug（URL用・ユニーク）</div>
          <input
            className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="例）kayachan-inc"
          />
        </label>

        <label className="grid gap-1">
          <div className="text-sm font-semibold text-white">カテゴリ</div>
          <input
            className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="例）飲食 / IT / 介護 ..."
          />
        </label>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {saving ? "作成中…" : "作成する"}
        </button>
      </div>
    </form>
  );
}
