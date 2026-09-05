import { prisma } from "@/lib/prisma";
import { addDays, dateStrToDate, dateToStr, todayStr, weekStartStr } from "@/lib/date";
import { estimate1RM } from "@/lib/calc";

export { estimate1RM } from "@/lib/calc";

/** 大分類の正規順。DB 上のその他カテゴリは末尾に付ける。 */
const CATEGORY_ORDER = ["胸", "背中", "脚", "肩", "腕", "その他"];

export function orderCategories(cats: string[]): string[] {
  const known = CATEGORY_ORDER.filter((c) => cats.includes(c));
  const extra = cats.filter((c) => !CATEGORY_ORDER.includes(c)).sort();
  return [...known, ...extra];
}

export async function getCategories(): Promise<string[]> {
  const rows = await prisma.exercise.findMany({
    distinct: ["category"],
    select: { category: true },
  });
  return orderCategories(rows.map((r) => r.category));
}

export async function getCategoriesWithCounts() {
  const cats = await getCategories();
  const grouped = await prisma.exercise.groupBy({
    by: ["category"],
    _count: { _all: true },
  });
  const map = new Map(grouped.map((g) => [g.category, g._count._all]));
  return cats.map((c) => ({ category: c, count: map.get(c) ?? 0 }));
}

export async function getExercisesByCategory(category: string) {
  return prisma.exercise.findMany({
    where: { category },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

export async function getAllExercises() {
  const rows = await prisma.exercise.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });
  const cats = orderCategories([...new Set(rows.map((r) => r.category))]);
  return cats.map((category) => ({
    category,
    exercises: rows.filter((r) => r.category === category),
  }));
}

export async function getExercise(id: number) {
  return prisma.exercise.findUnique({ where: { id } });
}

/** 指定日のセッション(なければ null) */
export async function getSessionByDate(dateStr: string) {
  return prisma.workoutSession.findUnique({
    where: { date: dateStrToDate(dateStr) },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
      },
    },
  });
}

export async function getOrCreateSession(dateStr: string) {
  const date = dateStrToDate(dateStr);
  const existing = await prisma.workoutSession.findUnique({ where: { date } });
  if (existing) return existing;
  return prisma.workoutSession.create({ data: { date } });
}

/** セット配列を種目ごとにまとめる */
export function groupSetsByExercise<
  T extends { exerciseId: number; exercise: { id: number; name: string; category: string } },
>(sets: T[]) {
  const order: number[] = [];
  const map = new Map<number, { exercise: T["exercise"]; sets: T[] }>();
  for (const s of sets) {
    if (!map.has(s.exerciseId)) {
      map.set(s.exerciseId, { exercise: s.exercise, sets: [] });
      order.push(s.exerciseId);
    }
    map.get(s.exerciseId)!.sets.push(s);
  }
  return order.map((id) => map.get(id)!);
}

/** 直近(今日を除く最新)のセッション */
export async function getRecentSession(beforeDateStr: string) {
  return prisma.workoutSession.findFirst({
    where: { date: { lt: dateStrToDate(beforeDateStr) } },
    orderBy: { date: "desc" },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
      },
    },
  });
}

/**
 * ある種目について、指定日より前で最後にその種目を行ったセッションのセット記録。
 * セット入力画面の初期値に使う。
 */
export async function getPreviousSetsForExercise(exerciseId: number, beforeDateStr: string) {
  const lastSet = await prisma.set.findFirst({
    where: { exerciseId, session: { date: { lt: dateStrToDate(beforeDateStr) } } },
    orderBy: { session: { date: "desc" } },
    select: { sessionId: true, session: { select: { date: true } } },
  });
  if (!lastSet) return null;
  const sets = await prisma.set.findMany({
    where: { exerciseId, sessionId: lastSet.sessionId },
    orderBy: { setNumber: "asc" },
  });
  return { date: dateToStr(lastSet.session.date), sets };
}

/**
 * 種目の自己ベスト(推定1RM最大)を返す。除外セットIDを指定可能。
 */
export async function getExercisePR(exerciseId: number, excludeSetIds: number[] = []) {
  const sets = await prisma.set.findMany({
    where: { exerciseId, id: { notIn: excludeSetIds.length ? excludeSetIds : [-1] } },
    select: { weight: true, reps: true },
  });
  let best = 0;
  let bestWeight = 0;
  for (const s of sets) {
    const e = estimate1RM(s.weight, s.reps);
    if (e > best) best = e;
    if (s.weight > bestWeight) bestWeight = s.weight;
  }
  return { best1RM: best, maxWeight: bestWeight };
}

export type WeeklyVolumeRow = {
  exerciseId: number;
  name: string;
  category: string;
  volume: number;
  sets: number;
};

async function volumeRowsForRange(startStr: string, endStr: string) {
  const sets = await prisma.set.findMany({
    where: {
      session: { date: { gte: dateStrToDate(startStr), lt: dateStrToDate(endStr) } },
    },
    include: { exercise: { select: { id: true, name: true, category: true } } },
  });
  const map = new Map<number, WeeklyVolumeRow>();
  let total = 0;
  for (const s of sets) {
    const v = s.weight * s.reps;
    total += v;
    const row = map.get(s.exerciseId) ?? {
      exerciseId: s.exerciseId,
      name: s.exercise.name,
      category: s.exercise.category,
      volume: 0,
      sets: 0,
    };
    row.volume += v;
    row.sets += 1;
    map.set(s.exerciseId, row);
  }
  const rows = [...map.values()].sort((a, b) => b.volume - a.volume);
  return { rows, total };
}

/** 今週(月曜始まり)の種目別ボリューム + 今週/先週合計比較 */
export async function getWeeklyVolume(refDateStr: string = todayStr()) {
  const thisStart = weekStartStr(refDateStr);
  const thisEnd = addDays(thisStart, 7);
  const lastStart = addDays(thisStart, -7);

  const [thisWeek, lastWeek] = await Promise.all([
    volumeRowsForRange(thisStart, thisEnd),
    volumeRowsForRange(lastStart, thisStart),
  ]);

  const diffPct =
    lastWeek.total > 0
      ? ((thisWeek.total - lastWeek.total) / lastWeek.total) * 100
      : null;

  return {
    weekStart: thisStart,
    rows: thisWeek.rows,
    thisTotal: thisWeek.total,
    lastTotal: lastWeek.total,
    diffPct,
  };
}

/** 種目の MAX重量 / 推定1RM の日次推移 */
export async function getExerciseHistory(exerciseId: number) {
  const sets = await prisma.set.findMany({
    where: { exerciseId },
    include: { session: { select: { date: true } } },
    orderBy: { session: { date: "asc" } },
  });
  const byDate = new Map<string, { maxWeight: number; best1RM: number; volume: number }>();
  for (const s of sets) {
    const d = dateToStr(s.session.date);
    const cur = byDate.get(d) ?? { maxWeight: 0, best1RM: 0, volume: 0 };
    cur.maxWeight = Math.max(cur.maxWeight, s.weight);
    cur.best1RM = Math.max(cur.best1RM, estimate1RM(s.weight, s.reps));
    cur.volume += s.weight * s.reps;
    byDate.set(d, cur);
  }
  return [...byDate.entries()].map(([date, v]) => ({
    date,
    maxWeight: Math.round(v.maxWeight * 10) / 10,
    best1RM: Math.round(v.best1RM * 10) / 10,
    volume: Math.round(v.volume),
  }));
}

export async function getBodyWeights() {
  const rows = await prisma.bodyWeight.findMany({ orderBy: { date: "asc" } });
  return rows.map((r) => ({ date: dateToStr(r.date), weight: r.weight }));
}

export async function getTemplates() {
  return prisma.menuTemplate.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      exercises: {
        orderBy: { sortOrder: "asc" },
        include: { exercise: true },
      },
    },
  });
}

export async function getTemplate(id: number) {
  return prisma.menuTemplate.findUnique({
    where: { id },
    include: {
      exercises: { orderBy: { sortOrder: "asc" }, include: { exercise: true } },
    },
  });
}
