"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dateStrToDate } from "@/lib/date";
import { getOrCreateSession } from "@/lib/queries";

function revalidateAll() {
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------------ */
/* セット記録                                                          */
/* ------------------------------------------------------------------ */

export type SetRow = { weight: number; reps: number };

/** 指定日・指定種目のセットを丸ごと置き換える */
export async function saveSets(
  dateStr: string,
  exerciseId: number,
  rows: SetRow[],
) {
  const session = await getOrCreateSession(dateStr);
  const clean = rows
    .filter((r) => Number.isFinite(r.weight) && Number.isFinite(r.reps) && r.reps > 0)
    .map((r, i) => ({
      sessionId: session.id,
      exerciseId,
      setNumber: i + 1,
      weight: r.weight,
      reps: r.reps,
    }));

  await prisma.$transaction([
    prisma.set.deleteMany({ where: { sessionId: session.id, exerciseId } }),
    ...(clean.length ? [prisma.set.createMany({ data: clean })] : []),
  ]);

  // セットが1つも残らないセッションは掃除
  const remaining = await prisma.set.count({ where: { sessionId: session.id } });
  if (remaining === 0 && !session.memo) {
    await prisma.workoutSession.delete({ where: { id: session.id } });
  }

  revalidateAll();
}

export async function updateSet(id: number, weight: number, reps: number) {
  await prisma.set.update({ where: { id }, data: { weight, reps } });
  revalidateAll();
}

export async function deleteSet(id: number) {
  await prisma.set.delete({ where: { id } });
  revalidateAll();
}

/** セッション内の1種目分をまとめて削除 */
export async function deleteSessionExercise(sessionId: number, exerciseId: number) {
  await prisma.set.deleteMany({ where: { sessionId, exerciseId } });
  revalidateAll();
}

export async function updateSessionMemo(dateStr: string, memo: string) {
  const trimmed = memo.trim();
  const session = await getOrCreateSession(dateStr);
  await prisma.workoutSession.update({
    where: { id: session.id },
    data: { memo: trimmed || null },
  });
  const remaining = await prisma.set.count({ where: { sessionId: session.id } });
  if (remaining === 0 && !trimmed) {
    await prisma.workoutSession.delete({ where: { id: session.id } });
  }
  revalidateAll();
}

export async function deleteSession(id: number) {
  await prisma.workoutSession.delete({ where: { id } });
  revalidateAll();
  redirect("/");
}

/* ------------------------------------------------------------------ */
/* 種目マスタ                                                          */
/* ------------------------------------------------------------------ */

export async function addExercise(category: string, name: string) {
  const c = category.trim();
  const n = name.trim();
  if (!c || !n) return;
  const existing = await prisma.exercise.findUnique({
    where: { category_name: { category: c, name: n } },
  });
  if (existing) return; // 同カテゴリ内の同名はスキップ
  const max = await prisma.exercise.aggregate({
    where: { category: c },
    _max: { sortOrder: true },
  });
  await prisma.exercise.create({
    data: { category: c, name: n, sortOrder: (max._max.sortOrder ?? -1) + 1 },
  });
  revalidateAll();
}

export async function renameExercise(id: number, name: string) {
  const n = name.trim();
  if (!n) return;
  const target = await prisma.exercise.findUnique({ where: { id } });
  if (!target || target.name === n) return;
  const dup = await prisma.exercise.findUnique({
    where: { category_name: { category: target.category, name: n } },
  });
  if (dup) return;
  await prisma.exercise.update({ where: { id }, data: { name: n } });
  revalidateAll();
}

export async function deleteExercise(id: number) {
  await prisma.exercise.delete({ where: { id } });
  revalidateAll();
}

/** 同カテゴリ内で表示順を1つ入れ替える */
export async function moveExercise(id: number, dir: "up" | "down") {
  const target = await prisma.exercise.findUnique({ where: { id } });
  if (!target) return;
  const siblings = await prisma.exercise.findMany({
    where: { category: target.category },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const idx = siblings.findIndex((s) => s.id === id);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;
  const other = siblings[swapIdx];
  await prisma.$transaction([
    prisma.exercise.update({ where: { id: target.id }, data: { sortOrder: other.sortOrder } }),
    prisma.exercise.update({ where: { id: other.id }, data: { sortOrder: target.sortOrder } }),
  ]);
  revalidateAll();
}

/* ------------------------------------------------------------------ */
/* 体重                                                                */
/* ------------------------------------------------------------------ */

export async function saveBodyWeight(dateStr: string, weight: number) {
  if (!Number.isFinite(weight) || weight <= 0) return;
  const date = dateStrToDate(dateStr);
  await prisma.bodyWeight.upsert({
    where: { date },
    create: { date, weight },
    update: { weight },
  });
  revalidateAll();
}

export async function deleteBodyWeight(dateStr: string) {
  await prisma.bodyWeight
    .delete({ where: { date: dateStrToDate(dateStr) } })
    .catch(() => {});
  revalidateAll();
}

/* ------------------------------------------------------------------ */
/* メニューテンプレート                                                */
/* ------------------------------------------------------------------ */

export async function createTemplate(name: string) {
  const n = name.trim();
  if (!n) return;
  const t = await prisma.menuTemplate.create({ data: { name: n } });
  revalidateAll();
  redirect(`/settings/templates/${t.id}`);
}

export async function renameTemplate(id: number, name: string) {
  const n = name.trim();
  if (!n) return;
  await prisma.menuTemplate.update({ where: { id }, data: { name: n } });
  revalidateAll();
}

export async function deleteTemplate(id: number) {
  await prisma.menuTemplate.delete({ where: { id } });
  revalidateAll();
  redirect("/settings");
}

export async function setTemplateExercises(templateId: number, exerciseIds: number[]) {
  await prisma.$transaction([
    prisma.menuTemplateExercise.deleteMany({ where: { menuTemplateId: templateId } }),
    ...(exerciseIds.length
      ? [
          prisma.menuTemplateExercise.createMany({
            data: exerciseIds.map((exerciseId, i) => ({
              menuTemplateId: templateId,
              exerciseId,
              sortOrder: i,
            })),
          }),
        ]
      : []),
  ]);
  revalidateAll();
}
