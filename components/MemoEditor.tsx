"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSessionMemo } from "@/app/actions";

export function MemoEditor({
  dateStr,
  initialMemo,
}: {
  dateStr: string;
  initialMemo: string;
}) {
  const router = useRouter();
  const [memo, setMemo] = useState(initialMemo);
  const [pending, start] = useTransition();
  const dirty = memo.trim() !== initialMemo.trim();

  return (
    <div className="card space-y-2">
      <h3 className="text-sm font-bold text-muted">メモ</h3>
      <textarea
        className="field min-h-16"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="調子・気づきなど"
      />
      <button
        type="button"
        disabled={!dirty || pending}
        onClick={() =>
          start(async () => {
            await updateSessionMemo(dateStr, memo);
            router.refresh();
          })
        }
        className="btn btn-sm disabled:opacity-40"
      >
        {pending ? "保存中…" : "メモを保存"}
      </button>
    </div>
  );
}
