# repz

ジムでスマホから使う、個人用の筋トレ記録 Web アプリ。

- トップ画面に「今日トレ」（保存済みなら先頭表示）「直近トレ」を最大重量・トータルボリューム付きで表示
- 前回記録との比較（セッション単位 / セット単位）
- 週間ボリューム可視化（種目別・全体、月曜始まり、今週 vs 前週の差分%）
- 前回値の自動入力・重量ステッパー（±2.5kg）・セットコピー
- PR（自己ベスト）バッジ … 推定1RM（Epley式）で判定
- メニューテンプレート（ワンタップ展開）
- 体重記録＋推移グラフ
- セッション/セットの事後編集・削除（1日複数回の統合にも使用）
- 種目マスタの追加・削除・並び替え
- CSV エクスポート（バックアップ）
- Basic 認証（`proxy.ts`、環境変数で有効化）
- アプリ内ヘルプ（`/help`）と、どのページからもトップへ一発で戻れる下部リンク

詳細仕様は [docs/設計ドキュメント.md](docs/設計ドキュメント.md)。

## 技術スタック

| 項目 | 選定 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| DB | SQLite（ローカル）/ Turso（本番） |
| ORM | Prisma 7 + `@prisma/adapter-libsql` |
| UI | Tailwind CSS v4 / Recharts |
| ホスティング | Vercel |

## セットアップ（ローカル）

```bash
npm install
cp .env.example .env          # DATABASE_URL は file:./prisma/dev.db のままでOK
npm run db:migrate            # マイグレーション適用（初回はDB作成）
npm run db:seed               # 初期種目リストを投入
npm run dev
```

http://localhost:3000 で起動。ローカルでは Basic 認証は無効（`.env` の `BASIC_AUTH_*` はコメントアウトのまま）。

### よく使うコマンド

| コマンド | 用途 |
|---|---|
| `npm run db:migrate` | スキーマ変更のマイグレーション作成・適用 |
| `npm run db:seed` | 初期種目の投入（既にあればスキップ） |
| `npm run db:studio` | Prisma Studio でデータ閲覧 |

## デプロイ（Vercel + Turso）

ビルドはマイグレーションを行わない（`prisma generate && next build` のみ）。
スキーマ適用と初期投入は **ローカルから1回だけ** 行う。

1. **Turso の DB を用意**（Turso ダッシュボード or Vercel の Turso 連携）
   URL（`libsql://repz-xxxx.turso.io`）と認証トークンを取得。

2. **Vercel の環境変数**

   | 変数 | 値 |
   |---|---|
   | `DATABASE_URL` | `libsql://repz-xxxx.turso.io` |
   | `DATABASE_AUTH_TOKEN` | Turso のトークン |
   | `BASIC_AUTH_USER` | 任意のユーザー名 |
   | `BASIC_AUTH_PASSWORD` | 任意のパスワード |
   | `APP_TZ_OFFSET_MINUTES` | `540`（JST。「今日」の判定に使用） |

   Vercel の Turso 連携を使う場合は `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` が
   自動セットされる（アプリはどちらの名前でも動く）。

3. **スキーマ適用＋初期投入**（ローカルから1回）

   ```powershell
   # PowerShell
   $env:DATABASE_URL = "libsql://repz-xxxx.turso.io?authToken=<TOKEN>"
   npm run db:push-turso
   ```

   ```bash
   # bash
   export DATABASE_URL="libsql://repz-xxxx.turso.io?authToken=<TOKEN>"
   npm run db:push-turso
   ```

   `db:push-turso` = `tsx scripts/setup-turso.ts && prisma db seed`。
   `setup-turso.ts` は libsql クライアントで `prisma/migrations/` の SQL を
   Turso に流し込み `_prisma_migrations` に記録する（Prisma 7 の schema engine は
   `libsql://` に接続できず `prisma migrate deploy` が P1013 になるための回避）。
   スキーマ変更時も、`npm run db:migrate` でローカルに migration を作ってから
   この手順を再実行すればよい。

4. Vercel で Deploy。`proxy.ts` が `BASIC_AUTH_*` を検出して Basic 認証を有効化する。
   スキーマ変更時は手順3を再実行する。

## データモデル

`exercises` / `workout_sessions` / `sets` / `body_weights` / `menu_templates` / `menu_template_exercises`
（[prisma/schema.prisma](prisma/schema.prisma) 参照）

- 日付は `YYYY-MM-DD` として扱い、DB には UTC 0時の `DateTime` で保存。
- 「今日」は `APP_TZ_OFFSET_MINUTES`（既定 JST）で判定。
- 1日1セッション（`workout_sessions.date` は unique）。

## 画面

| パス | 内容 |
|---|---|
| `/` | トップ（記録導線・今日トレ・直近トレ・週間ボリューム・体重サマリ） |
| `/help` | 使い方（アプリ内ヘルプ） |
| `/record` | 大分類 / テンプレート選択 |
| `/record/[category]` | 種目選択 |
| `/record/exercise/[id]` | セット入力（前回値・PR判定・メモ、`?date=` で過去日にも記録） |
| `/record/template/[id]` | テンプレートの種目を順に記録 |
| `/session/[date]` | セッション詳細・編集・削除 |
| `/recent` | 直近セッションへリダイレクト |
| `/volume` | 週間ボリューム詳細（週送り可） |
| `/exercise/[id]` | 種目別の重量推移グラフ |
| `/body-weight` | 体重記録・推移グラフ |
| `/settings` | 種目マスタ / テンプレート管理 / CSV |
| `/settings/templates/[id]` | テンプレート編集 |
| `/api/export` | CSV（`?type=bodyweight` で体重CSV） |
