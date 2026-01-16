// app/auth/login/_components/LoginForm.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type State = { email: string; password: string };

type Props = {
  nextPath?: string;
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

// open redirect対策：サイト内パスだけ許可（/から始まる）
function safeNext(nextPath?: string): string {
  if (!nextPath) return "/";
  const n = nextPath.trim();
  if (!n.startsWith("/")) return "/";
  // プロトコル混入などを軽く防ぐ
  if (n.startsWith("//")) return "/";
  return n;
}

export default function LoginForm({ nextPath }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [s, setS] = useState<State>({ email: "", password: "" });

  function set<K extends keyof State>(k: K, v: State[K]) {
    setS((p) => ({ ...p, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!s.email.trim() || !s.password.trim()) {
      setError("メールとパスワードを入れてね🥺");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: s.email.trim(), password: s.password.trim() }),
      });

      const text = await res.text();
      const payload = safeJson(text);

      if (!res.ok) {
        throw new Error(pickErrorMessage(payload, `ログインに失敗しました（${res.status}）`));
      }

      router.push(safeNext(nextPath));
      router.refresh();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "ログインに失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const nextInfo = safeNext(nextPath);

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-1">
        <div className="text-sm font-semibold">メールアドレス</div>
        <input
          className="rounded-xl border border-slate-200 px-4 py-3"
          value={s.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </label>

      <label className="grid gap-1">
        <div className="text-sm font-semibold">パスワード</div>
        <input
          type="password"
          className="rounded-xl border border-slate-200 px-4 py-3"
          value={s.password}
          onChange={(e) => set("password", e.target.value)}
        />
      </label>

      {nextInfo !== "/" ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-slate-700">
          ログイン後、元のページに戻るよ🫶
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        disabled={saving}
        className="rounded-2xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "ログイン中…" : "ログイン"}
      </button>

      <div className="text-sm text-slate-600">
        初めての方は{" "}
        <Link href="/auth/signup" className="font-semibold text-blue-600 hover:underline">
          会員登録
        </Link>
      </div>
    </form>
  );
}
