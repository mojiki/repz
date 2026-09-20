import Link from "next/link";
import { formatLong } from "@/lib/date";
import { totalVolume } from "@/lib/calc";
import { groupSetsByExercise } from "@/lib/queries";

type SetLite = {
  exerciseId: number;
  weight: number;
  reps: number;
  exercise: { id: number; name: string; category: string };
};

function fmtKg(n: number) {
  return `${Math.round(n).toLocaleString("ja-JP")}kg`;
}

/** トップ画面の「今日トレ」「直近トレ」で共通の1日ぶんサマリー表示 */
export function DayTrainingCard({
  title,
  date,
  sets,
  viewAllHref,
  emptyMessage,
}: {
  title: string;
  date: string | null;
  sets: SetLite[];
  viewAllHref?: string;
  emptyMessage: string;
}) {
  const groups = groupSetsByExercise(sets);

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
            <p className="text-xs text-muted">
              その日のトータル {fmtKg(totalVolume(sets))}
            </p>
          </div>
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
        </>
      ) : (
        <p className="text-sm text-muted">{emptyMessage}</p>
      )}
    </section>
  );
}
