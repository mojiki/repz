import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 は .env を自動読み込みしないため明示的にロードする。
// 既に DATABASE_URL がある場合 (CLI で明示指定 / Vercel) は上書きしない。
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(path.join(__dirname, ".env"));
  } catch {
    // .env が無い環境では環境変数がそのまま使われる
  }
}

// Turso: 認証トークンが別env (DATABASE_AUTH_TOKEN) にある場合は URL に載せる
// (schema engine は adapter を使わず datasource.url だけを見るため)
function datasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  const token = process.env.DATABASE_AUTH_TOKEN;
  if (!url || !token || url.includes("authToken=") || url.startsWith("file:")) {
    return url;
  }
  return `${url}${url.includes("?") ? "&" : "?"}authToken=${token}`;
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl(),
  },
});
