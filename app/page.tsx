import Link from "next/link";
import { dateToStr, formatLong, todayStr } from "@/lib/date";
import { totalVolume } from "@/lib/calc";
import {
  getBodyWeights,
  getRecentSession,
  getWeeklyVolume,
  groupSetsByExercise,
} from "@/lib/queries";
import { VolumeDiff } from "@/components/VolumeDiff";

export const dynamic = "force-dynamic";

function fmtKg(n: number) {
  return `${Math.round(n).toLocaleString("ja-JP")}kg`;
}

export default async function Home() {
  const today = todayStr();
  const [weekly, recent, weights] = await Promise.all([
    getWeeklyVolume(today),
    getRecentSession(today),
    getBodyWeights(),
  ]);

  const recentGroups = recent ? groupSetsByExercise(recent.sets) : [];
  const recentDate = recent ? dateToStr(recent.date) : null;
  const latestWeight = weights.at(-1);
  const topRows = weekly.rows.slice(0, 5);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{formatLong(today)}</p>

      <div className="grid grid-cols-1 gap-3">
        <Link href="/record" className="btn btn-primary py-5 text-lg">
          ＋ 記録する
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/recent" className="btn py-4">
            直近トレ
          </Link>
          <Link href="/body-weight" className="btn py-4">
            体重
          </Link>
        </div>
      </div>

      <section className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">今週のボリューム</h2>
          <Link href="/volume" className="text-xs text-accent">
            詳細 →
          </Link>
        </div>
        <VolumeDiff
          thisTotal={weekly.thisTotal}
          lastTotal={weekly.lastTotal}
          diffPct={weekly.diffPct}
        />
        {topRows.length > 0 ? (
          <ul className="divide-y divide-border">
            {topRows.map((r) => (
              <li key={r.exerciseId} className="flex justify-between py-2 text-sm">
                <span className="truncate">
                  <span className="chip mr-2">{r.category}</span>
                  {r.name}
                </span>
                <span className="tabular-nums text-muted">
                  {fmtKg(r.volume)} / {r.sets}set
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">今週はまだ記録がありません</p>
        )}
      </section>

      <section className="card space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">直近トレ</h2>
          {recentDate && (
            <Link href={`/session/${recentDate}`} className="text-xs text-accent">
              全部見る →
            </Link>
          )}
        </div>
        {recent && recentDate ? (
          <>
            <div className="flex items-baseline justify-between">
              <p className="text-xs text-muted">{formatLong(recentDate)}</p>
              <p className="text-xs text-muted">
                その日のトータル {fmtKg(totalVolume(recent.sets))}
              </p>
            </div>
            <ul className="space-y-1 text-sm">
              {recentGroups.map((g) => {
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
          <p className="text-sm text-muted">まだ記録がありません</p>
        )}
      </section>

      <section className="card flex items-center justify-between">
        <div>
          <h2 className="font-bold">体重</h2>
          <p className="text-xs text-muted">
            {latestWeight ? `${latestWeight.date} 時点` : "未記録"}
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black tabular-nums">
            {latestWeight ? latestWeight.weight : "–"}
          </span>
          <span className="ml-1 text-sm text-muted">kg</span>
        </div>
      </section>
    </div>
  );
}
