/**
 * 日付ユーティリティ。
 * 日付は "YYYY-MM-DD" 文字列で扱い、DB には UTC 0時の DateTime として保存する。
 * 1人利用のため固定タイムゾーン(既定: JST +540分)で「今日」を判定する。
 */

const TZ_OFFSET_MINUTES = Number(process.env.APP_TZ_OFFSET_MINUTES ?? 540);

/** 現在時刻をアプリのタイムゾーンに直した "YYYY-MM-DD" */
export function todayStr(): string {
  const now = new Date();
  const shifted = new Date(now.getTime() + TZ_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> DB 保存用 Date (UTC 0時) */
export function dateStrToDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

/** DB の Date -> "YYYY-MM-DD" */
export function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** n 日加算した "YYYY-MM-DD" */
export function addDays(s: string, n: number): string {
  const d = dateStrToDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToStr(d);
}

/** s を含む週の月曜日 (月曜始まり) の "YYYY-MM-DD" */
export function weekStartStr(s: string): string {
  const d = dateStrToDate(s);
  const day = d.getUTCDay(); // 0=日 .. 6=土
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(s, diff);
}

/** 表示用: "2026-09-06" -> "9/6(日)" */
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
export function formatShort(s: string): string {
  const d = dateStrToDate(s);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAYS[d.getUTCDay()]})`;
}

/** 表示用: "2026-09-06" -> "2026年9月6日(日)" */
export function formatLong(s: string): string {
  const d = dateStrToDate(s);
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日(${WEEKDAYS[d.getUTCDay()]})`;
}
