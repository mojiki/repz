import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Exercise } from "@/app/generated/prisma/client";
import { addDays, dateStrToDate, dateToStr, todayStr, weekStartStr } from "@/lib/date";
import { estimate1RM } from "@/lib/calc";

export { estimate1RM } from "@/lib/calc";

/*
 * 設計メモ (レスポンス対策):
 * DB が遠いと「直列に待つクエリの段数」がそのまま表示までの時間になる。
 * SQLite では Prisma の include / リレーション select が別クエリ (=直列) に
 * 分解されるため使わず、フラットなクエリを Promise.all で並列に投げて
 * 種目 (38行程度) とのひも付けだけ JS 側で行う。
 */

/** 種目マスタ全件を id で引けるようにしたもの (1リクエスト内ではキャッシュ) */
const getExerciseMap = cache(async () => {
  const all = await prisma.exercise.findMany();
  return new Map<number, Exercise>(all.map((e) => [e.id, e]));
});

/** セットに種目情報を付ける (種目が消えていたセットは除外) */
function attachExercise<T extends { exerciseId: number }>(
  sets: T[],
  exMap: Map<number, Exercise>,
): (T & { exercise: Exercise })[] {
  return sets.flatMap((s) => {
    const exercise = exMap.get(s.exerciseId);
    return exercise ? [{ ...s, exercise }] : [];
  });
}

/** 大分類の正規順。DB 上のその他カテゴリは末尾に付ける。 */
const CATEGORY_ORDER = ["胸", "背中", "脚", "肩", "腕", "その他"];

export function orderCategories(cats: string[]): string[] {
  const known = CATEGORY_ORDER.filter((c) => cats.includes(c));
  const extra = cats.filter((c) => !CATEGORY_ORDER.includes(c)).sort();
  return [...known, ...extra];
}

async function categoryCounts() {
  const grouped = await prisma.exercise.groupBy({
    by: ["category"],
    _count: { _all: true },
  });
  return new Map(grouped.map((g) => [g.category, g._count._all]));
}

export async function getCategoriesWithCounts() {
  const counts = await categoryCounts();
  return orderCategories([...counts.keys()]).map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  }));
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

/** 指定日のセッション(なければ null)。sets には exercise が付く。 */
export async function getSessionByDate(dateStr: string) {
  const date = dateStrToDate(dateStr);
  const [session, sets, exMap] = await Promise.all([
    prisma.workoutSession.findUnique({ where: { date } }),
    prisma.set.findMany({
      where: { session: { date } },
      orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
    }),
    getExerciseMap(),
  ]);
  if (!session) return null;
  return { ...session, sets: attachExercise(sets, exMap) };
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
  const [session, exMap] = await Promise.all([
    prisma.workoutSession.findFirst({
      where: { date: { lt: dateStrToDate(beforeDateStr) } },
      orderBy: { date: "desc" },
    }),
    getExerciseMap(),
  ]);
  if (!session) return null;
  const sets = await prisma.set.findMany({
    where: { sessionId: session.id },
    orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
  });
  return { ...session, sets: attachExercise(sets, exMap) };
}

/**
 * ある種目について、指定日より前で最後にその種目を行ったセッションのセット記録。
 * セット入力画面の初期値に使う。
 */
export async function getPreviousSetsForExercise(exerciseId: number, beforeDateStr: string) {
  const lastSet = await prisma.set.findFirst({
    where: { exerciseId, session: { date: { lt: dateStrToDate(beforeDateStr) } } },
    orderBy: { session: { date: "desc" } },
    select: { sessionId: true },
  });
  if (!lastSet) return null;
  const [sets, session] = await Promise.all([
    prisma.set.findMany({
      where: { exerciseId, sessionId: lastSet.sessionId },
      orderBy: { setNumber: "asc" },
    }),
    prisma.workoutSession.findUnique({
      where: { id: lastSet.sessionId },
      select: { date: true },
    }),
  ]);
  return { date: dateToStr(session!.date), sets };
}

/**
 * 指定日にやった各種目について「その種目を最後にやった日(指定日より前)」の合計ボリュームを返す。
 * プログレッシブオーバーロードの確認用 (種目ごとに前回と比べる)。
 *
 * 「指定日にやった種目」の絞り込みをリレーションフィルタでDB側に任せているので、
 * 今日のセッションを取得し終わるのを待たずに、他のクエリと並列に投げられる。
 */
export async function getPreviousExerciseTotals(dateStr: string) {
  const date = dateStrToDate(dateStr);
  const doneOnDate = { sets: { some: { session: { date } } } };
  const [sets, sessions] = await Promise.all([
    prisma.set.findMany({
      where: { session: { date: { lt: date } }, exercise: doneOnDate },
      select: { sessionId: true, exerciseId: true, weight: true, reps: true },
    }),
    prisma.workoutSession.findMany({
      where: { date: { lt: date }, sets: { some: { exercise: doneOnDate } } },
      select: { id: true, date: true },
    }),
  ]);
  const dateById = new Map(sessions.map((s) => [s.id, dateToStr(s.date)]));

  // 種目ごとに、いちばん新しい日付とその日のボリューム合計を求める
  const latest: Record<number, { date: string; volume: number }> = {};
  for (const s of sets) {
    const d = dateById.get(s.sessionId);
    if (!d) continue;
    const cur = latest[s.exerciseId];
    if (!cur || d > cur.date) latest[s.exerciseId] = { date: d, volume: 0 };
  }
  for (const s of sets) {
    const d = dateById.get(s.sessionId);
    const cur = latest[s.exerciseId];
    if (d && cur && d === cur.date) cur.volume += s.weight * s.reps;
  }
  return latest;
}

/**
 * 種目の自己ベスト(推定1RM最大)を返す。
 * excludeDateStr を渡すと、その日のセッションのセットは除いて集計する
 * (入力中の日の記録を「過去のベスト」に含めないため)。
 */
export async function getExercisePR(exerciseId: number, excludeDateStr?: string) {
  const sets = await prisma.set.findMany({
    where: {
      exerciseId,
      ...(excludeDateStr
        ? { session: { date: { not: dateStrToDate(excludeDateStr) } } }
        : {}),
    },
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

function setsInRange(startStr: string, endStr: string) {
  return prisma.set.findMany({
    where: {
      session: { date: { gte: dateStrToDate(startStr), lt: dateStrToDate(endStr) } },
    },
  });
}

function summarizeVolume(
  sets: { exerciseId: number; weight: number; reps: number }[],
  exMap: Map<number, Exercise>,
) {
  const map = new Map<number, WeeklyVolumeRow>();
  let total = 0;
  for (const s of attachExercise(sets, exMap)) {
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

  const [thisSets, lastSets, exMap] = await Promise.all([
    setsInRange(thisStart, thisEnd),
    setsInRange(lastStart, thisStart),
    getExerciseMap(),
  ]);
  const thisWeek = summarizeVolume(thisSets, exMap);
  const lastWeek = summarizeVolume(lastSets, exMap);

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
  const [sets, sessions] = await Promise.all([
    prisma.set.findMany({ where: { exerciseId } }),
    prisma.workoutSession.findMany({
      where: { sets: { some: { exerciseId } } },
      select: { id: true, date: true },
    }),
  ]);
  const dateById = new Map(sessions.map((s) => [s.id, dateToStr(s.date)]));
  const dated = sets
    .flatMap((s) => {
      const date = dateById.get(s.sessionId);
      return date ? [{ ...s, date }] : [];
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const byDate = new Map<string, { maxWeight: number; best1RM: number; volume: number }>();
  for (const s of dated) {
    const cur = byDate.get(s.date) ?? { maxWeight: 0, best1RM: 0, volume: 0 };
    cur.maxWeight = Math.max(cur.maxWeight, s.weight);
    cur.best1RM = Math.max(cur.best1RM, estimate1RM(s.weight, s.reps));
    cur.volume += s.weight * s.reps;
    byDate.set(s.date, cur);
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

function withExercises<
  T extends { id: number },
  L extends { menuTemplateId: number; exerciseId: number },
>(template: T, links: L[], exMap: Map<number, Exercise>) {
  const mine = links.filter((l) => l.menuTemplateId === template.id);
  return { ...template, exercises: attachExercise(mine, exMap) };
}

export async function getTemplates() {
  const [templates, links, exMap] = await Promise.all([
    prisma.menuTemplate.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.menuTemplateExercise.findMany({ orderBy: { sortOrder: "asc" } }),
    getExerciseMap(),
  ]);
  return templates.map((t) => withExercises(t, links, exMap));
}

export async function getTemplate(id: number) {
  const [template, links, exMap] = await Promise.all([
    prisma.menuTemplate.findUnique({ where: { id } }),
    prisma.menuTemplateExercise.findMany({
      where: { menuTemplateId: id },
      orderBy: { sortOrder: "asc" },
    }),
    getExerciseMap(),
  ]);
  if (!template) return null;
  return withExercises(template, links, exMap);
}
