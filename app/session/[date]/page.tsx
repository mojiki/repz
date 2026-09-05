import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui";
import { formatLong } from "@/lib/date";
import { getSessionByDate, groupSetsByExercise } from "@/lib/queries";
import { totalVolume } from "@/lib/calc";
import { SessionExerciseEditor } from "@/components/SessionExerciseEditor";
import { MemoEditor } from "@/components/MemoEditor";
import { DeleteSessionButton } from "@/components/SessionControls";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function SessionPage({
  params,
}: PageProps<"/session/[date]">) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();
  const session = await getSessionByDate(date);
  if (!session) notFound();

  const groups = groupSetsByExercise(session.sets);
  const dayVolume = totalVolume(session.sets);

  return (
    <div className="space-y-4">
      <BackLink href="/" label="トップ" />
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold">{formatLong(date)}</h1>
        <span className="text-sm text-muted tabular-nums">
          {Math.round(dayVolume).toLocaleString("ja-JP")}kg
        </span>
      </div>

      {groups.map((g) => (
        <SessionExerciseEditor
          key={g.exercise.id}
          sessionId={session.id}
          exercise={g.exercise}
          sets={g.sets.map((s) => ({
            id: s.id,
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
          }))}
          editDate={date}
        />
      ))}

      {groups.length === 0 && (
        <p className="text-sm text-muted">この日の種目記録はありません。</p>
      )}

      <Link href={`/record?date=${date}`} className="btn w-full border-dashed">
        ＋ この日に種目を追加
      </Link>

      <MemoEditor dateStr={date} initialMemo={session.memo ?? ""} />

      <div className="pt-2">
        <DeleteSessionButton sessionId={session.id} />
      </div>
    </div>
  );
}
