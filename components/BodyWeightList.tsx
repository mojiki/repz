"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBodyWeight } from "@/app/actions";
import { formatShort } from "@/lib/date";

export function BodyWeightList({
  rows,
}: {
  rows: { date: string; weight: number }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (rows.length === 0) {
    return <p className="text-sm text-muted">まだ記録がありません</p>;
  }

  return (
    <section className="card">
      <h2 className="mb-2 font-bold">記録一覧</h2>
      <ul className="divide-y divide-border">
        {rows.map((r, i) => {
          const prev = rows[i + 1];
          const diff = prev ? r.weight - prev.weight : null;
          return (
            <li key={r.date} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted">{formatShort(r.date)}</span>
              <span className="flex items-center gap-3">
                <span className="tabular-nums">{r.weight}kg</span>
                {diff !== null && (
                  <span
                    className={`w-14 text-right text-xs tabular-nums ${
                      diff <= 0 ? "text-good" : "text-bad"
                    }`}
                  >
                    {diff > 0 ? "+" : ""}
                    {diff.toFixed(1)}
                  </span>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`${r.date} の記録を削除しますか?`)) return;
                    start(async () => {
                      await deleteBodyWeight(r.date);
                      router.refresh();
                    });
                  }}
                  className="text-xs text-bad disabled:opacity-40"
                >
                  ×
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
