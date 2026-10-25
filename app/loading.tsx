/**
 * ページ遷移中に即座に表示するスケルトン。
 * 全ページ force-dynamic でサーバー応答まで時間がかかるため、タップ直後に
 * 画面を切り替えて「反応している」ことを見せる (体感速度の改善)。
 */
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-surface-2 motion-reduce:animate-none ${className}`} />;
}

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="読み込み中" className="space-y-4">
      <Bar className="h-4 w-24" />
      <Bar className="h-7 w-44" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="card space-y-3">
          <Bar className="h-4 w-32" />
          <Bar className="h-10 w-full" />
          <Bar className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
