"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = Record<string, number | string>;

export function LineTrend({
  data,
  xKey,
  series,
  height = 220,
  unit = "",
  yMin,
  labelSuffix = "",
  markKey,
}: {
  data: Point[];
  xKey: string;
  series: { key: string; name: string; color: string }[];
  height?: number;
  unit?: string;
  /** 縦軸の下限。総重量のように 0 が意味を持つ量は 0 を指定する (未指定は自動) */
  yMin?: number;
  /** ツールチップの日付の後ろに付ける文字 (例: 「〜の週」)。関数は Server から渡せないので文字列 */
  labelSuffix?: string;
  /** 1 の点を大きく (白縁つきで) 描く。最初の系列だけに適用。自己ベスト更新の強調用 */
  markKey?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted">
        データがありません
      </div>
    );
  }
  // 縦軸の目盛りの幅は、最大値の桁数から決める (固定幅だと 4 桁以上の総重量で先頭の桁が切れる)
  const maxY = Math.max(
    0,
    ...data.flatMap((d) => series.map((s) => Math.abs(Number(d[s.key]) || 0))),
  );
  const yWidth = Math.max(40, String(Math.ceil(maxY)).length * 7 + 14);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#2a3441" strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            tick={{ fill: "#93a1b0", fontSize: 11 }}
            tickFormatter={(v: string) => v.slice(5)}
            minTickGap={16}
          />
          <YAxis
            tick={{ fill: "#93a1b0", fontSize: 11 }}
            width={yWidth}
            domain={[yMin ?? "auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "#151b23",
              border: "1px solid #2a3441",
              borderRadius: 12,
              color: "#e8edf2",
            }}
            labelFormatter={(label) => `${label}${labelSuffix}`}
            formatter={(value, name) => [
              `${typeof value === "number" ? value.toLocaleString("ja-JP") : value}${unit}`,
              name as string,
            ]}
          />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={
                markKey && i === 0
                  ? (p) => {
                      const marked = Number(p.payload?.[markKey]) === 1;
                      return (
                        <circle
                          key={`dot-${p.index}`}
                          cx={p.cx}
                          cy={p.cy}
                          r={marked ? 5 : 2}
                          fill={s.color}
                          stroke={marked ? "#ffffff" : s.color}
                          strokeWidth={marked ? 2 : 0}
                        />
                      );
                    }
                  : { r: 2 }
              }
              activeDot={{ r: 4 }}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
