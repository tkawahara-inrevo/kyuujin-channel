// app/jobs/[id]/apply/_components/ApplyForm.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import OtherJobsModal from "./OtherJobsModal";

type Props = { jobId: string };

type FormState = {
  message: string;
  includeDocuments: boolean; // ✅ 追加：書類同封
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

export default function ApplyForm({ jobId }: Props) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({ message: "", includeDocuments: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openOtherJobs, setOpenOtherJobs] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const messageCount = useMemo(() => form.message.length, [form.message]);

  async function onSubmit() {
    setError(null);

    const applicant_message = form.message.trim();
    if (!applicant_message) {
      setError("志望動機・自己PRは必須だよ🥺");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/public/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          applicant_message,
          include_documents: form.includeDocuments,
        }),
      });

      const text = await res.text();
      const json = safeJson(text);

      if (!res.ok) {
        throw new Error(pickErrorMessage(json, `応募に失敗しました（status:${res.status}）`));
      }

      const p = json as { application_id?: unknown };
      const id = typeof p.application_id === "string" ? p.application_id : null;

      setDone(id ?? "送信完了");
      setOpenOtherJobs(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "応募に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function finishAndGoToJobs() {
    router.push("/jobs");
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-8">
        <Field label="志望動機・自己PR" required>
          <textarea
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            placeholder="志望動機や自己PRをご記入ください"
            rows={10}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base"
          />
          <div className="mt-2 text-sm text-slate-600">{messageCount}文字</div>
        </Field>

        {/* ✅ 追加：書類同封チェック */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.includeDocuments}
              onChange={(e) => setForm((p) => ({ ...p, includeDocuments: e.target.checked }))}
              className="mt-1 h-5 w-5"
            />
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                履歴書・職務経歴書も送付する（任意）
              </div>
              <div className="mt-1 text-sm text-slate-600">
                ※ プロフィールにアップロード済みの書類を応募に同封します。
                未アップロードの場合はエラーになるので、先に{" "}
                <Link href="/profile" className="font-semibold text-blue-600 hover:underline">
                  プロフィール
                </Link>
                からアップしてね🫶
              </div>
            </div>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          応募にあたり、
          <Link href="/privacy" className="font-semibold text-blue-600 hover:underline">
            プライバシーポリシー
          </Link>
          および
          <Link href="/terms" className="font-semibold text-blue-600 hover:underline">
            利用規約
          </Link>
          に同意したものとみなします。
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {done ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            応募を送信したよ✨（応募ID: {done}）
          </div>
        ) : null}
      </div>

      {/* 下固定ボタン */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl px-6 py-4">
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-extrabold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "送信中…" : "応募する"}
          </button>
        </div>
      </div>

      {/* 他のおすすめ求人モーダル（bulk応募にも同じチェックを引き継ぐ） */}
      <OtherJobsModal
        open={openOtherJobs}
        excludeJobId={jobId}
        onClose={() => setOpenOtherJobs(false)}
        applicantMessage={form.message.trim()}
        includeDocuments={form.includeDocuments}
        onDone={() => finishAndGoToJobs()}
      />
    </>
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
    <div>
      <div className="mb-2 text-base font-bold text-slate-900">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </div>
      {children}
    </div>
  );
}
