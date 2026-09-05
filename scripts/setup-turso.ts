/**
 * Turso にスキーマを適用する。
 *
 * Prisma 7 の `prisma migrate deploy` は datasource url が `libsql://` の場合
 * スキーマエンジンが接続できず P1013 になるため、libsql クライアントで
 * prisma/migrations/ の SQL を直接流し込み、_prisma_migrations に記録する。
 *
 * 使い方:
 *   $env:DATABASE_URL = "libsql://xxx.turso.io?authToken=<TOKEN>"
 *   npm run db:push-turso
 */
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

function resolve() {
  // URL は ?authToken= 付きでも可 (@libsql/client がそのまま解釈する)
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "";
  const authToken =
    process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;
  if (!url) {
    throw new Error(
      "DATABASE_URL (または TURSO_DATABASE_URL) が設定されていません",
    );
  }
  if (url.startsWith("file:")) {
    throw new Error(
      "このスクリプトは Turso 用です。ローカルは `npm run db:migrate` を使ってください",
    );
  }
  return { url, authToken };
}

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "checksum" TEXT NOT NULL,
  "finished_at" DATETIME,
  "migration_name" TEXT NOT NULL,
  "logs" TEXT,
  "rolled_back_at" DATETIME,
  "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
  "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
);`;

async function main() {
  const { url, authToken } = resolve();
  const client = createClient({ url, authToken });

  await client.execute(MIGRATIONS_TABLE);

  const applied = new Set(
    (
      await client.execute(
        `SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`,
      )
    ).rows.map((r) => String(r.migration_name)),
  );

  const dir = path.join(process.cwd(), "prisma", "migrations");
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d/.test(d.name))
    .map((d) => d.name)
    .sort();

  let count = 0;
  for (const name of names) {
    if (applied.has(name)) {
      console.log(`skip   ${name}`);
      continue;
    }
    const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");
    console.log(`apply  ${name}`);
    await client.executeMultiple(sql);
    await client.execute({
      sql: `INSERT INTO "_prisma_migrations"
              (id, checksum, migration_name, finished_at, applied_steps_count)
            VALUES (?, ?, ?, current_timestamp, 1)`,
      args: [
        randomUUID(),
        createHash("sha256").update(sql).digest("hex"),
        name,
      ],
    });
    count++;
  }

  console.log(count ? `applied ${count} migration(s)` : "already up to date");
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
