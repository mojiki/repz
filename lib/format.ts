/** 例: 1300 -> "1,300kg" (整数に丸める) */
export function fmtKg(n: number): string {
  return `${Math.round(n).toLocaleString("ja-JP")}kg`;
}

/** 差分用。小数1桁まで表示する (例: 2.5 -> "2.5kg", 80 -> "80kg") */
export function fmtKgPrecise(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}kg`;
}
