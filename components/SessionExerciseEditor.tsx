import Link from "next/link";
import { deleteSessionExercise } from "@/app/actions";
import { DangerButton } from "@/components/ui";
import { estimate1RM } from "@/lib/calc";

type SetLite = { id: number; setNumber: number; weight: number; reps: number };

export function SessionExerciseEditor({
  sessionId,
  exercise,
  sets,
  editDate,
}: {
  sessionId: number;
  exercise: { id: number; name: string; category: string };
  sets: SetLite[];
  editDate: string;
}) {
  const volume = sets.reduce((s, x) => s + x.weight * x.reps, 0);
  const best = Math.max(0, ...sets.map((s) => estimate1RM(s.weight, s.reps)));

  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <span className="chip">{exercise.category}</span>
          <h3 className="mt-1 font-bold">{exercise.name}</h3>
        </div>
        <Link
          href={`/record/exercise/${exercise.id}?date=${editDate}`}
          className="btn btn-sm"
        >
          編集
        </Link>
      </div>

      <table className="w-full text-sm">
        <tbody>
          {sets.map((s) => (
            <tr key={s.id} className="border-t border-border">
              <td className="py-1.5 text-muted">{s.setNumber}</td>
              <td className="py-1.5 text-right tabular-nums">{s.weight}kg</td>
              <td className="py-1.5 text-center text-muted">×</td>
              <td className="py-1.5 text-left tabular-nums">{s.reps}rep</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          ボリューム {Math.round(volume).toLocaleString("ja-JP")}kg / 推定1RM{" "}
          {best.toFixed(1)}kg
        </span>
        <DangerButton
          action={deleteSessionExercise.bind(null, sessionId, exercise.id)}
          confirm={`${exercise.name} の記録をこの日から削除しますか?`}
        >
          種目を削除
        </DangerButton>
      </div>
    </div>
  );
}
