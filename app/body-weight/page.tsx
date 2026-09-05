import { BackLink } from "@/components/ui";
import { todayStr } from "@/lib/date";
import { getBodyWeights } from "@/lib/queries";
import { BodyWeightForm } from "@/components/BodyWeightForm";
import { LineTrend } from "@/components/Chart";
import { BodyWeightList } from "@/components/BodyWeightList";

export const dynamic = "force-dynamic";

export default async function BodyWeightPage() {
  const weights = await getBodyWeights();
  const latest = weights.at(-1);
  const first = weights[0];
  const delta =
    latest && first && weights.length > 1 ? latest.weight - first.weight : null;

  return (
    <div className="space-y-4">
      <BackLink href="/" label="トップ" />
      <h1 className="text-lg font-bold">体重</h1>

      <BodyWeightForm today={todayStr()} defaultWeight={latest?.weight ?? 60} />

      <section className="card space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">推移</h2>
          {delta !== null && (
            <span className={`text-sm ${delta <= 0 ? "text-good" : "text-bad"}`}>
              期間 {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}kg
            </span>
          )}
        </div>
        <LineTrend
          data={weights}
          xKey="date"
          unit="kg"
          series={[{ key: "weight", name: "体重", color: "#38bdf8" }]}
        />
      </section>

      <BodyWeightList
        rows={[...weights].reverse()}
      />
    </div>
  );
}
