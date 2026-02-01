// lib/validators/uuid.ts

/**
 * UUIDの「形式(8-4-4-4-12)だけ」をチェックする（version/variantは見ない）
 * - テスト用ID（bbbb... / cccc...）も通る
 * - DBに投げる前のガードとして十分
 */
export function isUuidLoose(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * UUIDの「厳密チェック」（version=1-5, variant=8/9/a/b）
 * - “本当に必要な箇所だけ” 使う想定
 */
export function isUuidStrict(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
