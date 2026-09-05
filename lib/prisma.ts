import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/app/generated/prisma/client";
import { resolveDbConfig } from "@/lib/db-env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const { url, authToken } = resolveDbConfig();
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaLibSql({ url, authToken }),
    });
  }
  return globalForPrisma.prisma;
}

/**
 * 遅延初期化する Prisma クライアント。
 * 実際にアクセスされるまで接続情報を要求しないので、
 * ビルド時 (env 未設定) にモジュール評価だけで落ちることがない。
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
