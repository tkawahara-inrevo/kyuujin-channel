import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Kind = "resume" | "cv";

function isKind(v: string): v is Kind {
  return v === "resume" || v === "cv";
}

function extLower(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i + 1).toLowerCase();
}

function sanitizeFilename(name: string): string {
  // path traversal 防止 + 文字を軽く整える
  const base = name.split("/").pop()?.split("\\").pop() ?? "file";
  return base.replace(/[^\w.\-()+\s]/g, "_");
}

function allowedExt(ext: string): boolean {
  return ext === "pdf" || ext === "docx" || ext === "xlsx";
}

function allowedMime(mime: string): boolean {
  return (
    mime === "application/pdf" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function folderByKind(kind: Kind): string {
  return kind === "resume" ? "resume" : "cv";
}

export async function POST(req: Request) {
  // ✅ ログイン必須
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const kindRaw = String(form.get("kind") ?? "");
  if (!isKind(kindRaw)) {
    return NextResponse.json({ error: "kind must be resume or cv" }, { status: 400 });
  }
  const kind: Kind = kindRaw;

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const filename = sanitizeFilename(file.name || "file");
  const ext = extLower(filename);

  if (!allowedExt(ext)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: pdf, docx, xlsx" },
      { status: 400 }
    );
  }

  // MIME は環境で空になることがあるので「あるならチェック」にする
  if (file.type && !allowedMime(file.type)) {
    return NextResponse.json(
      { error: `Invalid mime type: ${file.type}` },
      { status: 400 }
    );
  }

  // サイズ制限（例：10MB）
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: "File too large. Max 10MB." },
      { status: 400 }
    );
  }

  // ✅ 保存先 path（ユーザー毎に分ける）
  const bucket = "applicant-files";
  const folder = folderByKind(kind);

  // 同名の上書きも許容（最新版として扱う）
  const path = `${user.id}/${folder}/${Date.now()}_${filename}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, bytes, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  // ✅ applicants 行が無い人もいるので upsert
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const display_name =
    (typeof meta.display_name === "string" && meta.display_name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (user.email ? user.email.split("@")[0] : "ユーザー");

  const email = (user.email ?? "").trim();
  const phone =
    typeof meta.phone === "string" && meta.phone.trim() ? meta.phone.trim() : null;

  const patch =
    kind === "resume"
      ? { resume_path: path, cv_path: null as string | null }
      : { cv_path: path, resume_path: null as string | null };

  // 「片方アップロードで片方が消える」事故を避けるため
  // update で行が無ければ insert する（2段）
  const { data: existing } = await supabaseAdmin
    .from("applicants")
    .select("id,resume_path,cv_path")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: insErr } = await supabaseAdmin.from("applicants").insert({
      id: user.id,
      display_name,
      email,
      phone,
      ...(kind === "resume" ? { resume_path: path } : { cv_path: path }),
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
  } else {
    const { error: updErr } = await supabaseAdmin
      .from("applicants")
      .update(kind === "resume" ? { resume_path: path } : { cv_path: path })
      .eq("id", user.id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, kind, path }, { status: 200 });
}
