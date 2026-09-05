function fmtKg(n: number) {
  return `${Math.round(n).toLocaleString("ja-JP")}kg`;
}

export function VolumeDiff({
  thisTotal,
  lastTotal,
  diffPct,
}: {
  thisTotal: number;
  lastTotal: number;
  diffPct: number | null;
}) {
  const up = (diffPct ?? 0) >= 0;
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="flex items-end justify-between">
        <span className="text-2xl font-black tabular-nums">{fmtKg(thisTotal)}</span>
        {diffPct !== null && (
          <span
            className={`text-sm font-bold ${up ? "text-good" : "text-bad"}`}
          >
            {up ? "▲" : "▼"} {up ? "+" : ""}
            {diffPct.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        前週: {fmtKg(lastTotal)}
        {diffPct === null && "（比較データなし）"}
      </p>
    </div>
  );
}
