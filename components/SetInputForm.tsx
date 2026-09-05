"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSets, updateSessionMemo, type SetRow } from "@/app/actions";
import { estimate1RM } from "@/lib/calc";

type Props = {
  dateStr: string;
  exerciseId: number;
  initialSets: SetRow[];
  previousSets: SetRow[];
  prBest1RM: number;
  initialMemo: string;
  backHref: string;
};

const STEP = 2.5;

export function SetInputForm({
  dateStr,
  exerciseId,
  initialSets,
  previousSets,
  prBest1RM,
  initialMemo,
  backHref,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const seed = (): SetRow[] => {
    if (initialSets.length) return initialSets.map((s) => ({ ...s }));
    if (previousSets.length) return previousSets.map((s) => ({ ...s }));
    return [{ weight: 20, reps: 10 }];
  };
  const [rows, setRows] = useState<SetRow[]>(seed);
  const [memo, setMemo] = useState(initialMemo);

  const patch = (i: number, key: keyof SetRow, value: number) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  };

  const addSet = () => {
    setRows((r) => {
      const template = previousSets[r.length] ?? r[r.length - 1] ?? { weight: 20, reps: 10 };
      return [...r, { ...template }];
    });
  };

  const removeSet = (i: number) => {
    setRows((r) => (r.length <= 1 ? r : r.filter((_, idx) => idx !== i)));
  };

  const save = () => {
    start(async () => {
      await saveSets(dateStr, exerciseId, rows);
      if (memo.trim() !== initialMemo.trim()) {
        await updateSessionMemo(dateStr, memo);
      }
      router.push(backHref);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const prev = previousSets[i];
        const isPR = prBest1RM > 0 && estimate1RM(row.weight, row.reps) > prBest1RM + 0.01;
        return (
          <div key={i} className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted">{i + 1} セット目</span>
              <div className="flex items-center gap-2">
                {isPR && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-fg">
                    MAX更新!
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeSet(i)}
                  className="text-xs text-muted disabled:opacity-30"
                  disabled={rows.length <= 1}
                >
                  削除
                </button>
              </div>
            </div>

            {prev && (
              <p className="text-[11px] text-muted">
                前回: {prev.weight}kg × {prev.reps}rep
              </p>
            )}

            {/* 重量 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-sm w-14"
                onClick={() => patch(i, "weight", Math.max(0, round(row.weight - STEP)))}
              >
                −{STEP}
              </button>
              <label className="relative flex-1">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  className="field text-center text-lg tabular-nums"
                  value={Number.isFinite(row.weight) ? row.weight : ""}
                  onChange={(e) => patch(i, "weight", parseFloat(e.target.value))}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                  kg
                </span>
              </label>
              <button
                type="button"
                className="btn btn-sm w-14"
                onClick={() => patch(i, "weight", round(row.weight + STEP))}
              >
                +{STEP}
              </button>
            </div>

            {/* レップ */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-sm w-14"
                onClick={() => patch(i, "reps", Math.max(0, (row.reps || 0) - 1))}
              >
                −1
              </button>
              <label className="relative flex-1">
                <input
                  type="number"
                  inputMode="numeric"
                  className="field text-center text-lg tabular-nums"
                  value={Number.isFinite(row.reps) ? row.reps : ""}
                  onChange={(e) => patch(i, "reps", parseInt(e.target.value, 10))}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                  rep
                </span>
              </label>
              <button
                type="button"
                className="btn btn-sm w-14"
                onClick={() => patch(i, "reps", (row.reps || 0) + 1)}
              >
                +1
              </button>
            </div>
          </div>
        );
      })}

      <button type="button" onClick={addSet} className="btn w-full border-dashed">
        ＋ セット追加
      </button>

      <label className="block">
        <span className="text-sm text-muted">メモ（セッション共通）</span>
        <textarea
          className="field mt-1 min-h-16"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="調子・気づきなど"
        />
      </label>

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="btn btn-primary w-full py-4 text-lg disabled:opacity-50"
      >
        {pending ? "保存中…" : "保存する"}
      </button>
    </div>
  );
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
