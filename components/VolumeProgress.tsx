import { compareVolume } from "@/lib/calc";
import { fmtKgPrecise } from "@/lib/format";

/**
 * 「前回に対してあと何kgか」を、文言＋細い進捗バーで見せる。
 * トレーニング中は未達が普通なので、未達は赤(マイナス表示)にせず中立色で「あと◯kg」、
 * 超えたら緑で「+◯kg 前回超え」。トップの今日トレとセット入力画面で共通利用する。
 */
export function VolumeProgress({
  label,
  current,
  previous,
  arrow = false,
}: {
  label: string;
  current: number;
  previous: number;
  /** セット入力画面用: 文言の頭に「→」を付ける */
  arrow?: boolean;
}) {
  const c = compareVolume(current, previous);
  const pct = Math.min(100, Math.round(c.ratio * 100));
  const status =
    c.kind === "exceeded"
      ? `+${fmtKgPrecise(c.diff)} 前回超え`
      : c.kind === "equal"
        ? "前回と同じ"
        : `あと ${fmtKgPrecise(-c.diff)}`;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="min-w-0 truncate text-muted">{label}</span>
        <span
          className={`shrink-0 font-bold tabular-nums ${
            c.kind === "exceeded" ? "text-good" : c.kind === "short" ? "text-accent" : "text-muted"
          }`}
        >
          {arrow ? "→ " : ""}
          {status}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} ${status}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={`h-full rounded-full ${c.kind === "exceeded" ? "bg-good" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
