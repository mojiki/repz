"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTemplate, deleteTemplate } from "@/app/actions";

export function TemplateSection({
  templates,
}: {
  templates: { id: number; name: string; exerciseNames: string[] }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      {templates.map((t) => (
        <div key={t.id} className="card">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">📋 {t.name}</h3>
            <div className="flex gap-2">
              <Link href={`/settings/templates/${t.id}`} className="btn btn-sm">
                編集
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`「${t.name}」を削除しますか?`)) return;
                  start(async () => {
                    await deleteTemplate(t.id);
                    router.refresh();
                  });
                }}
                className="btn btn-sm btn-ghost text-bad"
              >
                削除
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted">
            {t.exerciseNames.length
              ? t.exerciseNames.join(" ・ ")
              : "種目未登録"}
          </p>
        </div>
      ))}

      <div className="card space-y-2">
        <h3 className="text-sm font-bold text-muted">テンプレートを作成</h3>
        <div className="flex gap-2">
          <input
            className="field"
            placeholder="例: 胸の日"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            disabled={pending || !name.trim()}
            onClick={() =>
              start(async () => {
                await createTemplate(name);
              })
            }
            className="btn btn-sm btn-primary disabled:opacity-40"
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
}
