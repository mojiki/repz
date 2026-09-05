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
}: {
  data: Point[];
  xKey: string;
  series: { key: string; name: string; color: string }[];
  height?: number;
  unit?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted">
        データがありません
      </div>
    );
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#2a3441" strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            tick={{ fill: "#93a1b0", fontSize: 11 }}
            tickFormatter={(v: string) => v.slice(5)}
            minTickGap={16}
          />
          <YAxis
            tick={{ fill: "#93a1b0", fontSize: 11 }}
            width={44}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "#151b23",
              border: "1px solid #2a3441",
              borderRadius: 12,
              color: "#e8edf2",
            }}
            formatter={(value, name) => [`${value}${unit}`, name as string]}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 2 }}
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
