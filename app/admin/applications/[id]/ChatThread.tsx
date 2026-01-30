"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Msg = {
  id: string;
  sender_type: "applicant" | "company";
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

export default function ChatThread({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?application_id=${applicationId}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setMessages((json.messages ?? []) as Msg[]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId, body: text.trim() }),
      });
      if (!res.ok) {
        const t = await res.text();
        alert(`送信に失敗しました\n\n${t.slice(0, 200)}`);
        return;
      }
      setText("");
      await load();
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">応募者とのチャット</h2>
        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          更新
        </button>
      </div>

      <div className="mt-4 h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
        {loading ? (
          <div className="text-sm text-slate-600">読み込み中…</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-slate-600">まだメッセージはありません</div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_type === "company" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    m.sender_type === "company" ? "bg-blue-600 text-white" : "bg-white text-slate-900"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className={`mt-1 text-[11px] ${m.sender_type === "company" ? "text-blue-100" : "text-slate-500"}`}>
                    {fmt(m.created_at)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="応募者へメッセージを書く…"
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!canSend}
          onClick={send}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          送信
        </button>
      </div>
    </section>
  );
}
