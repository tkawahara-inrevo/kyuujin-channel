"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Msg = {
  id: string;
  sender_type: "applicant" | "company";
  body: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_type: "applicant" | "company";
  sender_user_id: string;
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

function isMessageRow(v: unknown): v is MessageRow {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;

  const senderType = r["sender_type"];
  return (
    typeof r["id"] === "string" &&
    typeof r["conversation_id"] === "string" &&
    (senderType === "applicant" || senderType === "company") &&
    typeof r["body"] === "string" &&
    typeof r["created_at"] === "string"
  );
}

export default function ChatThread({ applicationId }: { applicationId: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // ★ Realtime購読用
  const [conversationId, setConversationId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);

  const scrollBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  const load = async () => {
    if (!applicationId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/messages?application_id=${encodeURIComponent(applicationId)}`, {
        cache: "no-store",
      });
      const json: unknown = await res.json();

      if (!res.ok) return;

      if (typeof json === "object" && json !== null) {
        const r = json as Record<string, unknown>;
        const convId = typeof r["conversation_id"] === "string" ? r["conversation_id"] : null;
        const msgs = Array.isArray(r["messages"]) ? r["messages"] : [];

        if (convId) setConversationId(convId);

        const normalized: Msg[] = msgs
          .map((m) =>
            isMessageRow(m)
              ? { id: m.id, sender_type: m.sender_type, body: m.body, created_at: m.created_at }
              : null
          )
          .filter((x): x is Msg => x !== null);

        setMessages(normalized);
      }
    } finally {
      setLoading(false);
      scrollBottom();
    }
  };

  // 初回ロード（applicationId 変化で取り直し）
  useEffect(() => {
    setConversationId(null);
    setMessages([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  // ★ Realtime購読（conversationId が取れたら開始）
  useEffect(() => {
    if (!conversationId) return;

    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (!isMessageRow(payload.new)) return;
          const m = payload.new;

          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, { id: m.id, sender_type: m.sender_type, body: m.body, created_at: m.created_at }];
          });

          scrollBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

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

      // POSTの返却で conversation_id を拾って購読開始を確実にする（保険）
      try {
        const json: unknown = await res.json();
        if (typeof json === "object" && json !== null) {
          const r = json as Record<string, unknown>;
          const convId = typeof r["conversation_id"] === "string" ? r["conversation_id"] : null;
          if (convId) setConversationId(convId);
        }
      } catch {
        // ignore
      }

      setText("");
      router.refresh();

      // 自分の送信はRealtimeで増える想定。
      // もしRLS/Realtime設定がまだ不安なら、念のため有効化してもOK👇
      // await load();
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
