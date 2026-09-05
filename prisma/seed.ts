import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../app/generated/prisma/client";
import { resolveDbConfig } from "../lib/db-env";

// 環境変数が未設定のときだけ .env を読む
// (DATABASE_URL を明示的に渡して Turso 本番へ seed する場合は上書きしない)
if (!process.env.DATABASE_URL && !process.env.TURSO_DATABASE_URL) {
  try {
    process.loadEnvFile(path.join(__dirname, "..", ".env"));
  } catch {
    // ignore
  }
}

const prisma = new PrismaClient({ adapter: new PrismaLibSql(resolveDbConfig()) });

/** 大分類ごとの初期種目リスト */
const INITIAL: Record<string, string[]> = {
  胸: ["ベンチプレス", "インクラインベンチプレス", "ダンベルプレス", "チェストプレス", "ダンベルフライ", "ペックフライ", "ディップス"],
  背中: ["デッドリフト", "懸垂", "ラットプルダウン", "ベントオーバーロウ", "シーテッドロウ", "ワンハンドロウ"],
  脚: ["スクワット", "レッグプレス", "レッグエクステンション", "レッグカール", "ルーマニアンデッドリフト", "カーフレイズ", "ブルガリアンスクワット"],
  肩: ["ショルダープレス", "サイドレイズ", "フロントレイズ", "リアレイズ", "アップライトロウ", "シュラッグ"],
  腕: ["バーベルカール", "ダンベルカール", "ハンマーカール", "インクラインカール", "トライセプスプレスダウン", "スカルクラッシャー", "フレンチプレス"],
  その他: ["アブローラー", "クランチ", "レッグレイズ", "プランク", "バックエクステンション"],
};

async function main() {
  // 冪等: 既存の種目・並び順はそのまま、不足している初期種目だけ追加する
  for (const [category, names] of Object.entries(INITIAL)) {
    for (let i = 0; i < names.length; i++) {
      await prisma.exercise.upsert({
        where: { category_name: { category, name: names[i] } },
        create: { category, name: names[i], sortOrder: i },
        update: {},
      });
    }
  }
  console.log(`exercises total: ${await prisma.exercise.count()}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
