"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dateStrToDate } from "@/lib/date";

/** クライアントの Router Cache を破棄する (戻る操作で古い画面が出ないように) */
function revalidateAll() {
  revalidatePath("/", "layout");
}

/** 遷移先として許せるのはアプリ内の絶対パスだけ (//host や \ 始まりは不可) */
function safePath(p: string): string {
  return /^\/(?![/\\])/.test(p) ? p : "/";
}

/* ------------------------------------------------------------------ */
/* セット記録                                                          */
/* ------------------------------------------------------------------ */

export type SetRow = { weight: number; reps: number };

/**
 * 指定日・指定種目のセットを丸ごと置き換え、redirectTo へ遷移する。
 * メモが変わっていれば memo も同じ呼び出しで保存する (undefined なら触らない)。
 *
 * 遷移もサーバー側 redirect で行う: クライアントで router.push / refresh すると
 * 「遷移前の画面の再描画 + 遷移先の取得 + さらに refresh」と往復が増えるため。
 */
export async function saveSets(
  dateStr: string,
  exerciseId: number,
  rows: SetRow[],
  memo: string | undefined,
  redirectTo: string,
) {
  const date = dateStrToDate(dateStr);
  const nextMemo = memo === undefined ? undefined : memo.trim() || null;
  const session = await prisma.workoutSession.upsert({
    where: { date },
    create: { date, memo: nextMemo ?? null },
    update: nextMemo === undefined ? {} : { memo: nextMemo },
  });

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

  // セットを1つも残さず保存した場合だけ、空になったセッションを掃除する
  if (clean.length === 0 && !session.memo) {
    const remaining = await prisma.set.count({ where: { sessionId: session.id } });
    if (remaining === 0) {
      await prisma.workoutSession.delete({ where: { id: session.id } });
    }
  }

  revalidateAll();
  redirect(safePath(redirectTo));
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
  const date = dateStrToDate(dateStr);
  const next = memo.trim() || null;
  const session = await prisma.workoutSession.upsert({
    where: { date },
    create: { date, memo: next },
    update: { memo: next },
  });
  // メモを空にした結果、セットも無いセッションになったら掃除
  if (!next) {
    const remaining = await prisma.set.count({ where: { sessionId: session.id } });
    if (remaining === 0) {
      await prisma.workoutSession.delete({ where: { id: session.id } });
    }
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
