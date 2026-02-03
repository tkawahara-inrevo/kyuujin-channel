"use client";

import { useEffect, useState } from "react";

type Billing = {
  organization_id: string;
  plan: string;
  status: string;
  price_per_application?: number | null;
  updated_at?: string;
};

type Computed = {
  month_start_iso: string;
  current_month_applications: number;
  unit_price: number;
  current_month_amount: number;
};

function fmt(dt?: string) {
  if (!dt) return "";
  try {
    return new Date(dt).toLocaleString("ja-JP");
  } catch {
    return dt;
  }
}

export default function BillingClient() {
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [computed, setComputed] = useState<Computed | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setBilling(json.billing as Billing);
        setComputed(json.computed as Computed);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setPlan = async (plan: string) => {
    if (!billing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(`更新に失敗しました\n\n${JSON.stringify(json).slice(0, 200)}`);
        return;
      }
      setBilling(json.billing as Billing);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {loading ? (
        <div className="text-sm text-slate-600">読み込み中…</div>
      ) : !billing ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">データ取得に失敗しました</div>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">プラン</h2>
              <p className="mt-1 text-sm text-slate-700">
                応募数から今月の請求予定額を計算します（決済は未接続）
              </p>
            </div>
            <div className="text-xs text-slate-500">更新: {fmt(billing.updated_at)}</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["free", "basic", "pro"].map((p) => (
              <button
                key={p}
                type="button"
                disabled={saving}
                onClick={() => setPlan(p)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                  billing.plan === p
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-600">今月の応募数</div>
              <div className="mt-1 text-3xl font-bold">{computed?.current_month_applications ?? 0}</div>
              <div className="mt-1 text-xs text-slate-500">集計開始: {fmt(computed?.month_start_iso)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-600">応募単価</div>
              <div className="mt-1 text-3xl font-bold">{computed?.unit_price ?? 0}<span className="text-base font-semibold">円</span></div>
              <div className="mt-1 text-xs text-slate-500">プランに紐づく単価</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-600">今月の請求予定</div>
              <div className="mt-1 text-3xl font-bold">{computed?.current_month_amount ?? 0}<span className="text-base font-semibold">円</span></div>
              <div className="mt-1 text-xs text-slate-500">※ 決済は未接続</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
