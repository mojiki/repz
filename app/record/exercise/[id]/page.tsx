import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui";
import { formatShort, todayStr } from "@/lib/date";
import {
  getExercise,
  getExercisePR,
  getPreviousSetsForExercise,
  getSessionByDate,
} from "@/lib/queries";
import { SetInputForm } from "@/components/SetInputForm";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function ExerciseInputPage({
  params,
  searchParams,
}: PageProps<"/record/exercise/[id]">) {
  const { id: idRaw } = await params;
  const sp = await searchParams;
  const id = Number(idRaw);

  const dateParam = typeof sp.date === "string" && DATE_RE.test(sp.date) ? sp.date : null;
  const date = dateParam ?? todayStr();
  const isToday = date === todayStr();

  // 4つとも互いに依存しないので同時に投げる (直列にすると往復数ぶん遅くなる)
  const [exercise, session, previous, pr] = await Promise.all([
    getExercise(id),
    getSessionByDate(date),
    getPreviousSetsForExercise(id, date),
    getExercisePR(id, date),
  ]);
  if (!exercise) notFound();

  const backHref = isToday
    ? `/record/${encodeURIComponent(exercise.category)}`
    : `/session/${date}`;
  const backLabel = isToday ? exercise.category : "その日の記録";
  // 保存後: 今日の記録ならトップへ (次は別の部位へ移ることが多い)。過去日の編集は元の日の画面へ戻す
  const afterSaveHref = isToday ? "/" : `/session/${date}`;

  const todaysSets = (session?.sets ?? []).filter((s) => s.exerciseId === id);

  return (
    <div className="space-y-4">
      <BackLink href={backHref} label={backLabel} />
      <div>
        <p className="chip">{exercise.category}</p>
        <h1 className="mt-1 text-xl font-bold">{exercise.name}</h1>
        <p className="mt-1 text-xs text-muted">記録日: {formatShort(date)}</p>
        {previous && (
          <p className="mt-1 text-xs text-muted">
            前回 {formatShort(previous.date)}:{" "}
            {previous.sets.map((s) => `${s.weight}×${s.reps}`).join(" / ")}
          </p>
        )}
        {pr.maxWeight > 0 && (
          <p className="text-xs text-muted">
            自己ベスト {pr.maxWeight}kg（推定1RM {pr.best1RM.toFixed(1)}kg）
          </p>
        )}
      </div>

      <SetInputForm
        dateStr={date}
        exerciseId={id}
        initialSets={todaysSets.map((s) => ({ weight: s.weight, reps: s.reps }))}
        previousSets={previous?.sets.map((s) => ({ weight: s.weight, reps: s.reps })) ?? []}
        previousDate={previous?.date ?? null}
        prBest1RM={pr.best1RM}
        initialMemo={session?.memo ?? ""}
        afterSaveHref={afterSaveHref}
      />
    </div>
  );
}
