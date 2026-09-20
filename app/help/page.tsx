import { BackLink } from "@/components/ui";

export const metadata = { title: "使い方 · repz" };

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="relative border-l border-border pl-6 pb-4 last:border-transparent last:pb-0">
      <span className="absolute -left-3 top-0 grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">
        {n}
      </span>
      <p className="font-bold">{title}</p>
      <p className="text-sm text-muted">{children}</p>
    </li>
  );
}

export default function HelpPage() {
  return (
    <div className="space-y-5">
      <BackLink href="/" label="トップ" />
      <h1 className="text-lg font-bold">使い方</h1>

      <section className="card space-y-3">
        <h2 className="font-bold">トレーニングを記録する</h2>
        <ol className="ml-3 space-y-1">
          <Step n={1} title="大分類かメニューを選ぶ">
            胸・背中・脚・肩・腕・その他、または保存したメニューテンプレート。
          </Step>
          <Step n={2} title="種目を選ぶ">
            手入力はなし。無い種目は設定画面で追加する。
          </Step>
          <Step n={3} title="セットを入力する">
            前回同じ種目をやったときの重量・回数が初期値。重量は −2.5 / +2.5、回数は
            −1 / +1 ボタン（直接入力も可）。「＋ セット追加」で前回の対応セットをコピー。
          </Step>
          <Step n={4} title="保存する">
            推定1RM が自己ベストを超えたセットに「MAX更新!」バッジ。メモ欄はその日全体の共通メモ。
          </Step>
        </ol>
        <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
          <span className="font-bold text-foreground">推定1RM</span> = 重量 ×（1 + 回数
          ÷ 30）。全セットで計算した最大値を自己ベストとして判定します（実際に挙げた重量ではなく推定値）。
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">今日トレ・直近トレ</h2>
        <p className="text-sm text-muted">
          トップ画面は上から<b>今日トレ → 直近トレ → 週間ボリューム → 体重</b>の順。
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-bold">今日トレ</span> … 今日の記録を1件でも保存すると
            先頭に表示される（何も記録していない間は非表示）。
          </li>
          <li>
            <span className="font-bold">直近トレ</span> … 今日より前で最後にトレーニングした日の詳細へ。
            ここから編集・削除もできる。
          </li>
          <li>
            どちらも、日付とその日の<b>トータルボリューム</b>、種目ごとの
            <b>最大重量</b>と<b>トータルボリューム</b>（例: 「最大重量60kg / トータル1,300kg」）を表示する。
            セット数や単純な最大値だけだと、セットごとに重量・回数が違うと実態と合わないため。
          </li>
        </ul>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">週間ボリューム</h2>
        <p className="text-sm text-muted">
          ボリューム＝重量 × 回数の合計。週は月曜始まり。「今週 vs 前週」の増減%を表示。
          種目名をタップすると重量推移グラフ。
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">体重</h2>
        <p className="text-sm text-muted">
          日付（既定は今日、過去日も可）＋体重を記録。同じ日にもう一度記録すると上書き。
          推移グラフと前回比、一覧からの個別削除。
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">編集・削除（1日に複数回ジムに行ったとき）</h2>
        <p className="text-sm text-muted">
          トップ →「直近トレ」またはセッションを開くと:
        </p>
        <ul className="space-y-1 text-sm text-muted">
          <li>
            <span className="font-bold text-foreground">編集</span> …
            その種目のセット入力画面を、その日付として開く
          </li>
          <li>
            <span className="font-bold text-foreground">種目を削除</span> …
            その日のその種目だけ削除
          </li>
          <li>
            <span className="font-bold text-foreground">この日に種目を追加</span> …
            後から追記（2回目のジムぶんを1回目にまとめる用途）
          </li>
          <li>
            <span className="font-bold text-foreground">このセッションを削除</span> …
            その日を丸ごと削除
          </li>
        </ul>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">設定</h2>
        <ul className="space-y-1 text-sm text-muted">
          <li>
            <span className="font-bold text-foreground">種目</span> …
            大分類＋名前で追加。名前は編集してフォーカスを外すと保存。▲▼ で並び替え。
            削除するとその種目の過去記録も消える。
          </li>
          <li>
            <span className="font-bold text-foreground">メニューテンプレート</span> …
            作成 → 種目を追加・並び替え。記録時に「メニューから選ぶ」で展開。
          </li>
          <li>
            <span className="font-bold text-foreground">CSV エクスポート</span> …
            トレーニング記録と体重を書き出し。Excel でそのまま開ける。
          </li>
        </ul>
        <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
          自動バックアップはありません。月1回くらい CSV を保存しておくと安全です。
        </p>
      </section>
    </div>
  );
}
