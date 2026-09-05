/**
 * DB 接続情報の解決。
 * - ローカル: DATABASE_URL="file:./prisma/dev.db"
 * - Turso 手動設定: DATABASE_URL + DATABASE_AUTH_TOKEN
 * - Vercel の Turso インテグレーション: TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
 */
export function resolveDbConfig(): { url: string; authToken?: string } {
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken =
    process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;
  if (!url) {
    throw new Error(
      "DATABASE_URL (または TURSO_DATABASE_URL) が設定されていません",
    );
  }
  return { url, authToken };
}
