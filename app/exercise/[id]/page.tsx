import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/ui";
import { formatShort } from "@/lib/date";
import { getExercise, getExerciseHistory, getExercisePR } from "@/lib/queries";
import { LineTrend } from "@/components/Chart";

export const dynamic = "force-dynamic";

export default async function ExerciseHistoryPage({
  params,
}: PageProps<"/exercise/[id]">) {
  const { id } = await params;
  const exId = Number(id);
  const exercise = await getExercise(exId);
  if (!exercise) notFound();

  const [history, pr] = await Promise.all([
    getExerciseHistory(exId),
    getExercisePR(exId),
  ]);
  const recent = [...history].reverse().slice(0, 12);

  return (
    <div className="space-y-4">
      <BackLink href="/volume" label="週間ボリューム" />
      <div>
        <span className="chip">{exercise.category}</span>
        <h1 className="mt-1 text-xl font-bold">{exercise.name}</h1>
        {pr.maxWeight > 0 && (
          <p className="mt-1 text-xs text-muted">
            自己ベスト {pr.maxWeight}kg / 推定1RM {pr.best1RM.toFixed(1)}kg
          </p>
        )}
      </div>

      <Link href={`/record/exercise/${exId}`} className="btn btn-primary w-full">
        この種目を記録する
      </Link>

      <section className="card space-y-2">
        <h2 className="font-bold">重量推移</h2>
        <LineTrend
          data={history}
          xKey="date"
          unit="kg"
          series={[
            { key: "maxWeight", name: "MAX重量", color: "#ff5a1f" },
            { key: "best1RM", name: "推定1RM", color: "#38bdf8" },
          ]}
        />
      </section>

      <section className="card">
        <h2 className="mb-2 font-bold">最近の記録</h2>
        {recent.length > 0 ? (
          <ul className="divide-y divide-border">
            {recent.map((h) => (
              <li key={h.date} className="flex justify-between py-2 text-sm">
                <span className="text-muted">{formatShort(h.date)}</span>
                <span className="tabular-nums">
                  MAX {h.maxWeight}kg / vol {h.volume.toLocaleString("ja-JP")}kg
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">記録がありません</p>
        )}
      </section>
    </div>
  );
}
