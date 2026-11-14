import Link from "next/link";
import { redirect } from "next/navigation";
import { BackLink } from "@/components/ui";
import { FilterChips } from "@/components/FilterChips";
import { LineTrend } from "@/components/Chart";
import { addDays, dateStrToDate, formatShort, todayStr, weekStartStr } from "@/lib/date";
import { fmtKg } from "@/lib/format";
import {
  getCategoriesWithCounts,
  getVolumeSeries,
  type VolumePoint,
  type VolumeUnit,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "30", label: "1か月", days: 30 },
  { key: "90", label: "3か月", days: 90 },
  { key: "180", label: "6か月", days: 180 },
  { key: "all", label: "全期間", days: null },
] as const;
const DEFAULT_RANGE = "90";
const PAGE = 20;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Params = { unit: VolumeUnit; range: string; category?: string; n: number };

/** 既定値は URL から省く (共有・ブックマークしたときに短くなる) */
function href(p: Params) {
  const q = new URLSearchParams();
  if (p.unit === "day") q.set("unit", "day");
  if (p.range !== DEFAULT_RANGE) q.set("range", p.range);
  if (p.category) q.set("category", p.category);
  if (p.n > PAGE) q.set("n", String(p.n));
  const s = q.toString();
  return s ? `/history?${s}` : "/history";
}

function Delta({ volume, prev }: { volume: number; prev: number | null }) {
  if (volume === 0) return <span className="text-xs text-muted">休み</span>;
  if (prev === null || prev === 0) return null;
  const d = volume - prev;
  if (d === 0) return <span className="text-xs text-muted">±0</span>;
  // 減っても「悪い」とは限らない (部位が違う日など) ので、赤にはしない
  return d > 0 ? (
    <span className="text-xs font-bold tabular-nums text-good">▲ +{fmtKg(d)}</span>
  ) : (
    <span className="text-xs tabular-nums text-muted">▼ −{fmtKg(-d)}</span>
  );
}

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  const unit: VolumeUnit = one(sp.unit) === "day" ? "day" : "week";
  const range =
    RANGES.find((r) => r.key === one(sp.range)) ?? RANGES.find((r) => r.key === DEFAULT_RANGE)!;
  const categoryParam = one(sp.category) || undefined;
  const n = Math.min(400, Math.max(PAGE, Number(one(sp.n)) || PAGE));

  const today = todayStr();
  const from = range.days ? addDays(today, -range.days) : undefined;

  // 互いに依存しないので同時に取得する
  const [series, cats] = await Promise.all([
    getVolumeSeries({ unit, from, category: categoryParam, today }),
    getCategoriesWithCounts(),
  ]);
  if (categoryParam && !cats.some((c) => c.category === categoryParam)) {
    redirect(href({ unit, range: range.key, n: PAGE }));
  }

  const base: Params = { unit, range: range.key, category: categoryParam, n: PAGE };
  const thisWeek = weekStartStr(today);
  const active = series.filter((p) => p.volume > 0);
  const totalSessions = series.reduce((s, p) => s + p.sessions, 0);
  const avg = active.length ? active.reduce((s, p) => s + p.volume, 0) / active.length : 0;
  const best = active.reduce<VolumePoint | null>(
    (b, p) => (!b || p.volume > b.volume ? p : b),
    null,
  );
  const lastIsPartial = unit === "week" && series.at(-1)?.date === thisWeek;

  // 新しい順。差は「ひとつ前の点」との比較
  const rows = series.map((p, i) => ({ ...p, prev: i > 0 ? series[i - 1].volume : null })).reverse();
  const shown = rows.slice(0, n);

  const pointLabel = (p: VolumePoint) =>
    unit === "week" ? `${formatShort(p.date)}〜` : formatShort(p.date);
  const pointHref = (p: VolumePoint) => {
    if (unit === "day") return `/session/${p.date}`;
    const weeksAgo = Math.round(
      (dateStrToDate(thisWeek).getTime() - dateStrToDate(p.date).getTime()) / WEEK_MS,
    );
    if (weeksAgo > 52) return null; // /volume は 52 週前までしか遡れない
    return weeksAgo === 0 ? "/volume" : `/volume?w=-${weeksAgo}`;
  };

  return (
    <div className="space-y-4">
      <BackLink href="/" label="トップ" />
      <div>
        <h1 className="text-lg font-bold">推移</h1>
        <p className="text-xs text-muted">総重量 ＝ 重量 × 回数の合計（kg）</p>
      </div>

      <div className="card space-y-3">
        <FilterChips
          label="単位"
          items={[
            { label: "週別", href: href({ ...base, unit: "week" }), active: unit === "week" },
            { label: "日別", href: href({ ...base, unit: "day" }), active: unit === "day" },
          ]}
        />
        <FilterChips
          label="期間"
          items={RANGES.map((r) => ({
            label: r.label,
            href: href({ ...base, range: r.key }),
            active: r.key === range.key,
          }))}
        />
        <FilterChips
          label="部位"
          items={[
            { label: "すべて", href: href({ ...base, category: undefined }), active: !categoryParam },
            ...cats.map((c) => ({
              label: c.category,
              href: href({ ...base, category: c.category }),
              active: c.category === categoryParam,
            })),
          ]}
        />
      </div>

      <section className="card space-y-3">
        <h2 className="font-bold">総重量の推移</h2>

        {series.length > 0 && (
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center">
            <div>
              <p className="text-[11px] text-muted">トレ日数</p>
              <p className="text-sm font-bold tabular-nums">{totalSessions}日</p>
            </div>
            <div>
              <p className="text-[11px] text-muted">平均 / {unit === "week" ? "週" : "日"}</p>
              <p className="text-sm font-bold tabular-nums">{fmtKg(avg)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted">最高</p>
              <p className="text-sm font-bold tabular-nums">{best ? fmtKg(best.volume) : "–"}</p>
              {best && <p className="text-[10px] text-muted">{pointLabel(best)}</p>}
            </div>
          </div>
        )}

        <LineTrend
          data={series}
          xKey="date"
          unit="kg"
          yMin={0}
          labelSuffix={unit === "week" ? "〜の週" : ""}
          series={[{ key: "volume", name: "総重量", color: "#ff5a1f" }]}
        />

        {lastIsPartial && (
          <p className="text-xs text-muted">
            最後の点（{formatShort(thisWeek)}〜）は、今週の途中までの合計です。
          </p>
        )}
        {unit === "day" && !categoryParam && series.length > 0 && (
          <p className="text-xs text-muted">
            日別は、胸の日と脚の日など部位が違うと大きく変わります。部位で絞ると比べやすくなります。
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="mb-2 font-bold">一覧（新しい順）</h2>
        {shown.length > 0 ? (
          <ul className="divide-y divide-border">
            {shown.map((p) => {
              const to = pointHref(p);
              const body = (
                <>
                  <span className="text-muted">
                    {pointLabel(p)}
                    {lastIsPartial && p.date === thisWeek && (
                      <span className="ml-1 text-[11px]">（今週・途中）</span>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{p.volume > 0 ? fmtKg(p.volume) : "–"}</span>
                    <span className="w-24 text-right">
                      <Delta volume={p.volume} prev={p.prev} />
                    </span>
                  </span>
                </>
              );
              return (
                <li key={p.date}>
                  {to ? (
                    <Link href={to} className="flex items-center justify-between py-2 text-sm">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between py-2 text-sm">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">この条件の記録はありません</p>
        )}
        {rows.length > shown.length && (
          <Link
            href={href({ ...base, n: n + PAGE })}
            replace
            scroll={false}
            className="btn btn-sm mt-3 w-full"
          >
            さらに表示（残り {rows.length - shown.length} 件）
          </Link>
        )}
      </section>
    </div>
  );
}
