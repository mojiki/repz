/** Epley 式の推定1RM (reps<=1 は weight をそのまま返す) */
export function estimate1RM(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return 0;
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

/** セット配列の総ボリューム (weight * reps の合計) */
export function totalVolume(sets: { weight: number; reps: number }[]): number {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export type VolumeComparison = {
  /** exceeded=前回超え / equal=同じ / short=まだ足りない */
  kind: "exceeded" | "equal" | "short";
  /** current - previous (kg, 小数1桁に丸め) */
  diff: number;
  /** current / previous (previous<=0 のときは 0) */
  ratio: number;
};

/** 今回ボリュームを前回ボリュームと比べる (プログレッシブオーバーロード確認用) */
export function compareVolume(current: number, previous: number): VolumeComparison {
  const diff = Math.round((current - previous) * 10) / 10;
  return {
    kind: diff > 0 ? "exceeded" : diff < 0 ? "short" : "equal",
    diff,
    ratio: previous > 0 ? current / previous : 0,
  };
}
