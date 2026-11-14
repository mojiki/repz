import Link from "next/link";
import { redirect } from "next/navigation";
import type { Exercise } from "@/app/generated/prisma/client";
import { BackLink } from "@/components/ui";
import { FilterChips } from "@/components/FilterChips";
import { HistoryTabs } from "@/components/HistoryTabs";
import { LineTrend } from "@/components/Chart";
import { addDays, formatShort, todayStr } from "@/lib/date";
import { fmtKgPrecise } from "@/lib/format";
import {
  getCategoriesWithCounts,
  getExercise,
  getExercisesWithRecords,
  getLastTrainedExercise,
  getWeightSeries,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "30", label: "1か月", days: 30 },
  { key: "90", label: "3か月", days: 90 },
  { key: "180", label: "6か月", days: 180 },
  { key: "all", label: "全期間", days: null },
] as const;
// 重量の伸びは長い期間で見るほど意味があるので、総重量(3か月)と違い全期間が既定
const DEFAULT_RANGE = "all";
const PAGE = 20;

type Params = { exercise?: number; category?: string; range: string; n: number };

/** 既定値は URL から省く。種目を指定したときは大分類は種目から決まるので載せない */
function href(p: Params) {
  const q = new URLSearchParams();
  if (p.exercise) q.set("exercise", String(p.exercise));
  else if (p.category) q.set("category", p.category);
  if (p.range !== DEFAULT_RANGE) q.set("range", p.range);
  if (p.n > PAGE) q.set("n", String(p.n));
  const s = q.toString();
  return s ? `/history/weight?${s}` : "/history/weight";
}

function Delta({ value, prev, unit }: { value: number; prev: number | null; unit: "kg" | "回" }) {
  if (prev === null) return <span className="text-xs text-muted">初回</span>;
  const d = Math.round((value - prev) * 10) / 10;
  const fmt = (n: number) => (unit === "kg" ? fmtKgPrecise(n) : `${n}回`);
  if (d === 0) return <span className="text-xs text-muted">±0</span>;
  // 軽くした日 (デロードなど) もあるので、減少は赤にしない
  return d > 0 ? (
    <span className="text-xs font-bold tabular-nums text-good">▲ +{fmt(d)}</span>
  ) : (
    <span className="text-xs tabular-nums text-muted">▼ −{fmt(-d)}</span>
  );
}

export default async function WeightHistoryPage({
  searchParams,
}: PageProps<"/history/weight">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  const idNum = Number(one(sp.exercise));
  const exerciseId = Number.isInteger(idNum) && idNum > 0 ? idNum : undefined;
  const categoryParam = one(sp.category) || undefined;
  const range =
    RANGES.find((r) => r.key === one(sp.range)) ?? RANGES.find((r) => r.key === DEFAULT_RANGE)!;
  const n = Math.min(400, Math.max(PAGE, Number(one(sp.n)) || PAGE));

  const today = todayStr();
  const from = range.days ? addDays(today, -range.days) : undefined;

  // 1回目: 互いに依存しないものを同時に取得
  const [cats, byId, last, listByCat] = await Promise.all([
    getCategoriesWithCounts(),
    exerciseId ? getExercise(exerciseId) : Promise.resolve(null),
    !exerciseId && !categoryParam ? getLastTrainedExercise() : Promise.resolve(null),
    categoryParam && !exerciseId ? getExercisesWithRecords(categoryParam) : Promise.resolve(null),
  ]);
  if (exerciseId && !byId) redirect(href({ range: range.key, n: PAGE }));
  if (categoryParam && !exerciseId && !cats.some((c) => c.category === categoryParam)) {
    redirect(href({ range: range.key, n: PAGE }));
  }

  // 種目の決め方: 指定された種目 → (指定が無ければ)最後にトレーニングした種目 → 指定された部位の先頭の種目
  const exercise: Exercise | null = byId ?? last ?? listByCat?.[0] ?? null;
  const category = exercise?.category ?? categoryParam;

  // 2回目: 選んだ種目の推移と、同じ部位の種目チップ
  const [weight, chipExercises] = await Promise.all([
    exercise ? getWeightSeries(exercise.id, from) : Promise.resolve(null),
    !category
      ? Promise.resolve([] as Exercise[])
      : listByCat && category === categoryParam
        ? Promise.resolve(listByCat)
        : getExercisesWithRecords(category),
  ]);

  const points = weight?.points ?? [];
  const bodyweight = weight?.bodyweight ?? false;
  const unit = bodyweight ? "回" : "kg";
  const fmtVal = (v: number) => (bodyweight ? `${v}回` : fmtKgPrecise(v));
  const base: Params = { range: range.key, n: PAGE };

  const latest = points.at(-1);
  const first = points[0];
  const best = points.reduce<(typeof points)[number] | null>(
    (b, p) => (!b || p.value > b.value ? p : b),
    null,
  );
  const records = points.filter((p) => p.isRecord === 1).length;
  const rows = [...points].reverse();
  const shown = rows.slice(0, n);

  return (
    <div className="space-y-4">
      <BackLink href="/" label="トップ" />
      <div>
        <h1 className="text-lg font-bold">推移</h1>
        <p className="text-xs text-muted">種目ごとの、扱っている重量の伸び（日ごとの最大重量）</p>
      </div>

      <HistoryTabs active="weight" />

      <div className="card space-y-3">
        <FilterChips
          label="部位"
          items={cats.map((c) => ({
            label: c.category,
            href: href({ ...base, category: c.category }),
            active: c.category === category,
          }))}
        />
        {category && (
          <FilterChips
            label="種目（記録のあるもの）"
            items={chipExercises.map((e) => ({
              label: e.name,
              href: href({ ...base, exercise: e.id }),
              active: e.id === exercise?.id,
            }))}
          />
        )}
        {category && chipExercises.length === 0 && (
          <p className="text-xs text-muted">この部位の記録はまだありません。</p>
        )}
        <FilterChips
          label="期間"
          items={RANGES.map((r) => ({
            label: r.label,
            href: href({ ...base, exercise: exercise?.id, category, range: r.key }),
            active: r.key === range.key,
          }))}
        />
      </div>

      {!exercise ? (
        <section className="card">
          <p className="text-sm text-muted">
            {category ? "この部位の記録はまだありません。" : "まだ記録がありません。"}
          </p>
        </section>
      ) : (
        <>
          <section className="card space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="min-w-0 font-bold">
                <span className="truncate">{exercise.name}</span>
                <span className="ml-2 text-xs font-normal text-muted">
                  {bodyweight ? "最大回数（自重）" : "最大重量・推定1RM"}
                </span>
              </h2>
              <span className="flex shrink-0 gap-3 text-xs">
                <Link href={`/record/exercise/${exercise.id}`} className="text-accent">
                  記録する
                </Link>
                <Link href={`/exercise/${exercise.id}`} className="text-accent">
                  詳細 →
                </Link>
              </span>
            </div>

            {points.length > 0 && latest && first && best && (
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center">
                <div>
                  <p className="text-[11px] text-muted">直近</p>
                  <p className="text-sm font-bold tabular-nums">{fmtVal(latest.value)}</p>
                  <p className="text-[10px] text-muted">{formatShort(latest.date)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">期間の変化</p>
                  <p className="text-sm font-bold tabular-nums">
                    {points.length >= 2 ? (
                      <Delta value={latest.value} prev={first.value} unit={unit} />
                    ) : (
                      "–"
                    )}
                  </p>
                  <p className="text-[10px] text-muted">{formatShort(first.date)}〜</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">最高</p>
                  <p className="text-sm font-bold tabular-nums">{fmtVal(best.value)}</p>
                  <p className="text-[10px] text-muted">{formatShort(best.date)}</p>
                </div>
              </div>
            )}

            <LineTrend
              data={points.map((p) => ({
                date: p.date,
                maxWeight: p.maxWeight,
                best1RM: p.best1RM,
                maxReps: p.maxReps,
                isRecord: p.isRecord,
              }))}
              xKey="date"
              unit={unit}
              markKey="isRecord"
              series={
                bodyweight
                  ? [{ key: "maxReps", name: "最大回数", color: "#ff5a1f" }]
                  : [
                      { key: "maxWeight", name: "最大重量", color: "#ff5a1f" },
                      { key: "best1RM", name: "推定1RM", color: "#38bdf8" },
                    ]
              }
            />

            {records > 0 && (
              <p className="text-xs text-muted">
                大きい点は<b>自己ベスト更新</b>の日（{bodyweight ? "最大回数" : "最大重量"}が、
                それまでの最高を上回った日）。この期間に {records} 回更新しています。
              </p>
            )}
            {bodyweight && (
              <p className="text-xs text-muted">
                この種目は重量が 0kg（自重）の記録なので、重量の代わりに最大回数で表示しています。
              </p>
            )}
            {!bodyweight && points.length > 0 && (
              <p className="text-xs text-muted">
                推定1RM は回数も加味した指標です（重量 × (1 + 回数 ÷ 30)）。重量を維持して回数が増えたときに伸びます。
              </p>
            )}
          </section>

          <section className="card">
            <h2 className="mb-2 font-bold">一覧（新しい順）</h2>
            {shown.length > 0 ? (
              <ul className="divide-y divide-border">
                {shown.map((p) => (
                  <li key={p.date}>
                    <Link
                      href={`/session/${p.date}`}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span className="text-muted">{formatShort(p.date)}</span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums">
                          {bodyweight ? `${p.maxReps}回` : `${p.maxWeight}kg × ${p.topReps}`}
                        </span>
                        <span className="flex w-28 items-center justify-end gap-1.5">
                          {p.isRecord === 1 && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-fg">
                              更新
                            </span>
                          )}
                          <Delta value={p.value} prev={p.prev} unit={unit} />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                この期間の記録はありません（期間を長くしてみてください）。
              </p>
            )}
            {rows.length > shown.length && (
              <Link
                href={href({ ...base, exercise: exercise.id, n: n + PAGE })}
                replace
                scroll={false}
                className="btn btn-sm mt-3 w-full"
              >
                さらに表示（残り {rows.length - shown.length} 件）
              </Link>
            )}
          </section>
        </>
      )}
    </div>
  );
}
