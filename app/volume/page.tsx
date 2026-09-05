import Link from "next/link";
import { BackLink } from "@/components/ui";
import { addDays, formatShort, todayStr, weekStartStr } from "@/lib/date";
import { getWeeklyVolume } from "@/lib/queries";
import { VolumeDiff } from "@/components/VolumeDiff";

export const dynamic = "force-dynamic";

function fmtKg(n: number) {
  return `${Math.round(n).toLocaleString("ja-JP")}kg`;
}

export default async function VolumePage({ searchParams }: PageProps<"/volume">) {
  const sp = await searchParams;
  const offset = Number(typeof sp.w === "string" ? sp.w : 0) || 0;
  const clamped = Math.min(0, Math.max(-52, offset));
  const ref = addDays(weekStartStr(todayStr()), clamped * 7);
  const weekly = await getWeeklyVolume(ref);

  const weekEnd = addDays(weekly.weekStart, 6);

  return (
    <div className="space-y-4">
      <BackLink href="/" label="トップ" />
      <div className="flex items-center justify-between">
        <Link href={`/volume?w=${clamped - 1}`} className="btn btn-sm">
          ← 前週
        </Link>
        <span className="text-sm font-bold">
          {formatShort(weekly.weekStart)} – {formatShort(weekEnd)}
        </span>
        <Link
          href={`/volume?w=${clamped + 1}`}
          className={`btn btn-sm ${clamped >= 0 ? "pointer-events-none opacity-30" : ""}`}
        >
          翌週 →
        </Link>
      </div>

      <section className="card space-y-3">
        <h2 className="font-bold">総ボリューム（今週 vs 先週）</h2>
        <VolumeDiff
          thisTotal={weekly.thisTotal}
          lastTotal={weekly.lastTotal}
          diffPct={weekly.diffPct}
        />
      </section>

      <section className="card">
        <h2 className="mb-2 font-bold">種目別</h2>
        {weekly.rows.length > 0 ? (
          <ul className="divide-y divide-border">
            {weekly.rows.map((r) => (
              <li key={r.exerciseId} className="flex items-center justify-between py-2">
                <Link href={`/exercise/${r.exerciseId}`} className="min-w-0 flex-1 truncate">
                  <span className="chip mr-2">{r.category}</span>
                  {r.name}
                </Link>
                <span className="ml-2 shrink-0 text-sm tabular-nums text-muted">
                  {fmtKg(r.volume)} / {r.sets}set
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">この週の記録はありません</p>
        )}
      </section>
    </div>
  );
}
