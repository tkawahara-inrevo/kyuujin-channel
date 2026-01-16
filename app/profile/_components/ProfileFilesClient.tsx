"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  hasResume: boolean;
  hasCv: boolean;
};

type Kind = "resume" | "cv";

function allowedByExt(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  return name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".xlsx");
}

export default function ProfileFilesClient({ hasResume, hasCv }: Props) {
  const router = useRouter();

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(kind: Kind, file: File | null) {
    setError(null);
    if (!file) {
      setError("ファイルを選んでね🥺");
      return;
    }
    if (!allowedByExt(file)) {
      setError("対応形式は PDF / DOCX / XLSX だよ🥺");
      return;
    }

    setBusy(kind);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);

      const res = await fetch("/api/profile/upload", { method: "POST", body: fd });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `upload failed (${res.status})`);

      router.refresh();
      if (kind === "resume") setResumeFile(null);
      if (kind === "cv") setCvFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function openSigned(kind: Kind) {
    setError(null);
    try {
      const res = await fetch(`/api/profile/file-url?kind=${kind}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `failed (${res.status})`);
      window.open(j.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "開けませんでした");
    }
  }

  return (
    <div className="grid gap-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* 履歴書 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-extrabold">履歴書</div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".pdf,.docx,.xlsx"
            onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />

          <button
            type="button"
            onClick={() => upload("resume", resumeFile)}
            disabled={busy !== null}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy === "resume" ? "アップロード中…" : "履歴書をアップロード"}
          </button>

          {hasResume ? (
            <button
              type="button"
              onClick={() => openSigned("resume")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              履歴書を開く
            </button>
          ) : null}
        </div>
      </div>

      {/* 職務経歴書 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-extrabold">職務経歴書</div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".pdf,.docx,.xlsx"
            onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />

          <button
            type="button"
            onClick={() => upload("cv", cvFile)}
            disabled={busy !== null}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy === "cv" ? "アップロード中…" : "職務経歴書をアップロード"}
          </button>

          {hasCv ? (
            <button
              type="button"
              onClick={() => openSigned("cv")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              職務経歴書を開く
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
