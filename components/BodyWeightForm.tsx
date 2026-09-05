"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBodyWeight } from "@/app/actions";

export function BodyWeightForm({
  today,
  defaultWeight,
}: {
  today: string;
  defaultWeight: number;
}) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState<number>(defaultWeight);
  const [pending, start] = useTransition();

  const submit = () => {
    if (!Number.isFinite(weight) || weight <= 0) return;
    start(async () => {
      await saveBodyWeight(date, weight);
      router.refresh();
    });
  };

  return (
    <div className="card space-y-3">
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="text-xs text-muted">日付</span>
          <input
            type="date"
            className="field mt-1"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="flex-1">
          <span className="text-xs text-muted">体重 (kg)</span>
          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              className="btn btn-sm w-11"
              onClick={() => setWeight((w) => round(w - 0.1))}
            >
              −
            </button>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className="field text-center tabular-nums"
              value={Number.isFinite(weight) ? weight : ""}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
            />
            <button
              type="button"
              className="btn btn-sm w-11"
              onClick={() => setWeight((w) => round(w + 0.1))}
            >
              ＋
            </button>
          </div>
        </label>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {pending ? "保存中…" : "体重を記録"}
      </button>
    </div>
  );
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}
