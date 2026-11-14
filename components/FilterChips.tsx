import Link from "next/link";

/**
 * 絞り込みの選択肢 (単位・期間・部位など)。選択状態は URL の検索パラメータで持つので、
 * 全部リンク。replace にして、切り替えるたびに「戻る」の履歴が増えないようにする。
 */
export function FilterChips({
  label,
  items,
}: {
  label: string;
  items: { label: string; href: string; active: boolean }[];
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <Link
            key={i.label}
            href={i.href}
            replace
            scroll={false}
            aria-current={i.active ? "true" : undefined}
            className={`btn btn-sm ${i.active ? "btn-primary" : ""}`}
          >
            {i.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
