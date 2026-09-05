import { prisma } from "@/lib/prisma";
import { dateToStr, todayStr } from "@/lib/date";

export const dynamic = "force-dynamic";

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: (string | number | null)[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export async function GET(req: Request) {
  const type = new URL(req.url).searchParams.get("type");

  if (type === "bodyweight") {
    const rows = await prisma.bodyWeight.findMany({ orderBy: { date: "asc" } });
    const csv = toCsv([
      ["date", "weight_kg"],
      ...rows.map((r) => [dateToStr(r.date), r.weight]),
    ]);
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="repz-bodyweight-${todayStr()}.csv"`,
      },
    });
  }

  const sets = await prisma.set.findMany({
    orderBy: [{ session: { date: "asc" } }, { exerciseId: "asc" }, { setNumber: "asc" }],
    include: {
      session: { select: { date: true, memo: true } },
      exercise: { select: { category: true, name: true } },
    },
  });

  const csv = toCsv([
    ["date", "category", "exercise", "set_number", "weight_kg", "reps", "volume_kg", "session_memo"],
    ...sets.map((s) => [
      dateToStr(s.session.date),
      s.exercise.category,
      s.exercise.name,
      s.setNumber,
      s.weight,
      s.reps,
      Math.round(s.weight * s.reps * 100) / 100,
      s.session.memo ?? "",
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="repz-workouts-${todayStr()}.csv"`,
    },
  });
}
