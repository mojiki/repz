import Link from "next/link";

const TABS = [
  { key: "volume", label: "総重量", href: "/history" },
  { key: "weight", label: "重量の伸び（種目別）", href: "/history/weight" },
] as const;

/**
 * 推移の2つの画面 (総重量 / 種目別の重量の伸び) の切り替え。
 * 切り替えても「戻る」の履歴が増えないよう replace にする。
 */
export function HistoryTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="推移の種類" className="grid grid-cols-2 gap-2">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          replace
          aria-current={t.key === active ? "page" : undefined}
          className={`btn btn-sm justify-center ${t.key === active ? "btn-primary" : ""}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
