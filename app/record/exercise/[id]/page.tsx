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
  const exercise = await getExercise(id);
  if (!exercise) notFound();

  const dateParam = typeof sp.date === "string" && DATE_RE.test(sp.date) ? sp.date : null;
  const date = dateParam ?? todayStr();
  const isToday = date === todayStr();
  const backHref = isToday
    ? `/record/${encodeURIComponent(exercise.category)}`
    : `/session/${date}`;
  const backLabel = isToday ? exercise.category : "その日の記録";

  const [session, previous] = await Promise.all([
    getSessionByDate(date),
    getPreviousSetsForExercise(id, date),
  ]);

  const todaysSets = (session?.sets ?? []).filter((s) => s.exerciseId === id);
  const pr = await getExercisePR(id, todaysSets.map((s) => s.id));

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
        prBest1RM={pr.best1RM}
        initialMemo={session?.memo ?? ""}
        backHref={backHref}
      />
    </div>
  );
}
