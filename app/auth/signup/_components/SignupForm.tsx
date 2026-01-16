"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type State = {
  display_name: string;
  email: string;
  phone: string;
  password: string;
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

export default function SignupForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [s, setS] = useState<State>({
    display_name: "",
    email: "",
    phone: "",
    password: "",
  });

  function set<K extends keyof State>(k: K, v: State[K]) {
    setS((p) => ({ ...p, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!s.display_name.trim()) return setError("氏名は必須だよ🥺");
    if (!s.email.trim()) return setError("メールは必須だよ🥺");
    if (!s.phone.trim()) return setError("電話番号は必須だよ🥺");
    if (s.password.trim().length < 8) return setError("パスワードは8文字以上にしてね🥺");

    setSaving(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          display_name: s.display_name.trim(),
          email: s.email.trim(),
          phone: s.phone.trim(),
          password: s.password.trim(),
        }),
      });

      const text = await res.text();
      const payload = safeJson(text);

      if (!res.ok) throw new Error(pickErrorMessage(payload, `登録に失敗しました（${res.status}）`));

      const next = (nextPath ?? "").trim();
      router.push(next ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login");
      router.refresh();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-1">
        <div className="text-sm font-semibold">氏名 *</div>
        <input
          className="rounded-xl border border-slate-200 px-4 py-3"
          value={s.display_name}
          onChange={(e) => set("display_name", e.target.value)}
          placeholder="山田 太郎"
        />
      </label>

      <label className="grid gap-1">
        <div className="text-sm font-semibold">メールアドレス *</div>
        <input
          className="rounded-xl border border-slate-200 px-4 py-3"
          value={s.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="example@email.com"
        />
      </label>

      <label className="grid gap-1">
        <div className="text-sm font-semibold">電話番号 *</div>
        <input
          className="rounded-xl border border-slate-200 px-4 py-3"
          value={s.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="090-1234-5678"
        />
      </label>

      <label className="grid gap-1">
        <div className="text-sm font-semibold">パスワード（8文字以上） *</div>
        <input
          type="password"
          className="rounded-xl border border-slate-200 px-4 py-3"
          value={s.password}
          onChange={(e) => set("password", e.target.value)}
        />
      </label>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        disabled={saving}
        className="rounded-2xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "登録中…" : "会員登録する"}
      </button>

      <div className="text-sm text-slate-600">
        すでに会員の方は{" "}
        <Link
          href={nextPath ? `/auth/login?next=${encodeURIComponent(nextPath)}` : "/auth/login"}
          className="font-semibold text-blue-600 hover:underline"
        >
          ログイン
        </Link>
      </div>
    </form>
  );
}
