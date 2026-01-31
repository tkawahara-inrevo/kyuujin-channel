"use client";

import { useEffect, useMemo, useState } from "react";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  created_at: string;
};

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString("ja-JP");
  } catch {
    return dt;
  }
}

function stars(n: number) {
  return "★".repeat(Math.max(0, Math.min(5, n))) + "☆".repeat(Math.max(0, 5 - Math.min(5, Math.max(0, n))));
}

export default function ReviewSection({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const canSend = useMemo(() => body.trim().length > 0 && !sending, [body, sending]);
  const avg = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?organization_id=${organizationId}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setReviews((json.reviews ?? []) as Review[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organizationId, rating, title, body: body.trim() }),
      });
      if (res.status === 401) {
        setAuthRequired(true);
        return;
      }
      if (!res.ok) {
        const t = await res.text();
        alert(`投稿に失敗しました\n\n${t.slice(0, 200)}`);
        return;
      }
      setTitle("");
      setBody("");
      setRating(5);
      setAuthRequired(false);
      await load();
    } finally {
      setSending(false);
    }
  };

  const fillTemplate = (t: { rating: number; title: string; body: string }) => {
    setRating(t.rating);
    setTitle(t.title);
    setBody(t.body);
    setAuthRequired(false);
  };

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">口コミ</h2>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <div className="rounded-full bg-slate-100 px-3 py-1 font-semibold">平均 {avg || 0} / 5</div>
        <div className="text-slate-600">（{reviews.length}件）</div>
        <div className="text-slate-600">ログインしていればすぐ投稿できます</div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          まずは1件投稿してみてください ✍️（デモの理解が一気に進みます）
          <div className="mt-2 flex flex-wrap gap-2">
            {[{
              rating: 5,
              title: "対応が早くて安心でした",
              body: "応募後すぐに返信があり、面談日程の調整もスムーズでした。\nチャットで確認できるのが便利でした。",
            },{
              rating: 4,
              title: "仕事内容が分かりやすい",
              body: "求人票の内容が具体的で、選考の流れも明確でした。\n次は面談まで進めたいです。",
            },{
              rating: 3,
              title: "ふつう",
              body: "全体的に普通でした。\nチャットがあるのは便利だと思います。",
            }].map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => fillTemplate(t)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
              >
                例文を入れる（{t.rating}★）
              </button>
            ))}
          </div>
        </div>

        {authRequired && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            口コミの投稿にはログインが必要です。先にログインしてください🥺
            <div className="mt-2">
              <a
                href={`/auth/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
                className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                ログインする
              </a>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold text-slate-700">評価</div>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}（{stars(n)}）
              </option>
            ))}
          </select>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル（任意）"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="本文（例：返信が早かった／チャットが便利だった など）"
          className="min-h-[90px] resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!canSend}
          onClick={submit}
          className="w-fit rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          投稿
        </button>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="text-sm text-slate-600">読み込み中…</div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            まだ口コミがありません
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{stars(r.rating)}</div>
                  <div className="text-xs text-slate-500">{fmt(r.created_at)}</div>
                </div>
                {r.title && <div className="mt-2 font-semibold">{r.title}</div>}
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{r.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
