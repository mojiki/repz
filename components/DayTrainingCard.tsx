import Link from "next/link";
import { formatLong } from "@/lib/date";
import { compareVolume, totalVolume } from "@/lib/calc";
import { fmtKg, fmtKgPrecise } from "@/lib/format";
import { groupSetsByExercise } from "@/lib/queries";
import { VolumeProgress } from "@/components/VolumeProgress";

type SetLite = {
  exerciseId: number;
  weight: number;
  reps: number;
  exercise: { id: number; name: string; category: string };
};

/** 種目ID -> その種目を前回やった日と合計ボリューム */
export type PreviousTotals = Record<number, { date: string; volume: number }>;

/** 種目行の右上に出す「前回との差」 */
function ExerciseDelta({
  volume,
  prevVolume,
  everDone,
}: {
  volume: number;
  /** 比較できる前回ボリューム (自重など0kgだった種目は null) */
  prevVolume: number | null;
  /** 前回以前にその種目の記録があるか */
  everDone: boolean;
}) {
  if (prevVolume === null) {
    // 記録はあるが0kg(自重)の種目は比較しようがないので何も出さない
    return everDone ? null : <span className="text-xs text-muted">初回</span>;
  }
  const c = compareVolume(volume, prevVolume);
  if (c.kind === "exceeded")
    return <span className="text-xs font-bold tabular-nums text-good">▲ +{fmtKgPrecise(c.diff)}</span>;
  if (c.kind === "equal") return <span className="text-xs text-muted">前回と同じ</span>;
  return <span className="text-xs font-bold tabular-nums text-accent">あと {fmtKgPrecise(-c.diff)}</span>;
}

/**
 * トップ画面の「今日トレ」「直近トレ」で共通の1日ぶんサマリー表示。
 * previous を渡すと「同じ種目の前回」と比べる表示 (今日トレ用) になる。
 */
export function DayTrainingCard({
  title,
  date,
  sets,
  viewAllHref,
  emptyMessage,
  previous,
}: {
  title: string;
  date: string | null;
  sets: SetLite[];
  viewAllHref?: string;
  emptyMessage: string;
  previous?: PreviousTotals;
}) {
  const groups = groupSetsByExercise(sets);

  // 前回との比較は、前回の記録がある(かつ0kgでない=自重種目を除く)種目だけで行う
  const baseline = (exerciseId: number) => {
    const p = previous?.[exerciseId];
    return p && p.volume > 0 ? p.volume : null;
  };
  const comparable = groups.filter((g) => baseline(g.exercise.id) !== null);
  const compareCur = comparable.reduce((s, g) => s + totalVolume(g.sets), 0);
  const comparePrev = comparable.reduce((s, g) => s + (baseline(g.exercise.id) ?? 0), 0);

  return (
    <section className="card space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">{title}</h2>
        {date && viewAllHref && (
          <Link href={viewAllHref} className="text-xs text-accent">
            全部見る →
          </Link>
        )}
      </div>
      {date && groups.length > 0 ? (
        <>
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-muted">{formatLong(date)}</p>
            <p className="text-xs text-muted">その日のトータル {fmtKg(totalVolume(sets))}</p>
          </div>

          {previous && comparable.length > 0 && (
            <VolumeProgress
              label={`同種目の前回比${comparable.length < groups.length ? "（初回の種目を除く）" : ""}`}
              current={compareCur}
              previous={comparePrev}
            />
          )}

          {previous ? (
            <ul className="divide-y divide-border text-sm">
              {groups.map((g) => {
                const volume = totalVolume(g.sets);
                const maxWeight = Math.max(...g.sets.map((s) => s.weight));
                const prevVolume = baseline(g.exercise.id);
                return (
                  <li key={g.exercise.id} className="space-y-0.5 py-2 first:pt-1 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate">{g.exercise.name}</span>
                      <span className="shrink-0">
                        <ExerciseDelta
                          volume={volume}
                          prevVolume={prevVolume}
                          everDone={previous?.[g.exercise.id] !== undefined}
                        />
                      </span>
                    </div>
                    <p className="text-xs tabular-nums text-muted">
                      最大重量{maxWeight}kg / トータル{fmtKg(volume)}
                      {prevVolume !== null && `（前回 ${fmtKg(prevVolume)}）`}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="space-y-1 text-sm">
              {groups.map((g) => {
                const maxWeight = Math.max(...g.sets.map((s) => s.weight));
                const volume = totalVolume(g.sets);
                return (
                  <li key={g.exercise.id} className="flex justify-between">
                    <span className="min-w-0 truncate">{g.exercise.name}</span>
                    <span className="ml-2 shrink-0 text-muted">
                      最大重量{maxWeight}kg / トータル{fmtKg(volume)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <p className="text-sm text-muted">{emptyMessage}</p>
      )}
    </section>
  );
}
