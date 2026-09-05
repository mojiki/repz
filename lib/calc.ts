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
