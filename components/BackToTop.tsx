"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * どのページの下部にも出す「Topに戻る」導線。
 * 記録の階層 (大分類→種目→セット入力) が深くなっても、
 * 1つ前の画面ではなく直接トップへ戻れるようにするため全画面共通で表示する。
 */
export function BackToTop() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <Link
      href="/"
      className="btn mt-8 w-full justify-center text-muted"
    >
      ← Topに戻る
    </Link>
  );
}
