"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameTemplate, setTemplateExercises } from "@/app/actions";

type Ex = { id: number; name: string };
type Group = { category: string; exercises: Ex[] };

export function TemplateEditor({
  templateId,
  name: initialName,
  selectedIds: initialSelected,
  groups,
}: {
  templateId: number;
  name: string;
  selectedIds: number[];
  groups: Group[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(initialName);
  const [selected, setSelected] = useState<number[]>(initialSelected);

  const exById = useMemo(() => {
    const m = new Map<number, Ex & { category: string }>();
    for (const g of groups)
      for (const e of g.exercises) m.set(e.id, { ...e, category: g.category });
    return m;
  }, [groups]);

  const persist = (ids: number[]) => {
    setSelected(ids);
    start(async () => {
      await setTemplateExercises(templateId, ids);
      router.refresh();
    });
  };

  const add = (id: number) => !selected.includes(id) && persist([...selected, id]);
  const remove = (id: number) => persist(selected.filter((x) => x !== id));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= selected.length) return;
    const next = [...selected];
    [next[i], next[j]] = [next[j], next[i]];
    persist(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted">テンプレート名</label>
        <input
          className="field mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() =>
            name.trim() &&
            name.trim() !== initialName &&
            start(async () => {
              await renameTemplate(templateId, name);
              router.refresh();
            })
          }
        />
      </div>

      <div className="card space-y-1">
        <h3 className="mb-1 text-sm font-bold text-muted">
          含まれる種目 {pending && <span className="text-accent">保存中…</span>}
        </h3>
        {selected.length === 0 && (
          <p className="text-sm text-muted">下から種目を追加してください</p>
        )}
        {selected.map((id, i) => {
          const ex = exById.get(id);
          if (!ex) return null;
          return (
            <div
              key={id}
              className="flex items-center gap-2 border-t border-border py-1.5 first:border-0"
            >
              <span className="w-5 text-center text-xs text-muted">{i + 1}</span>
              <span className="flex-1 text-sm">
                <span className="chip mr-2">{ex.category}</span>
                {ex.name}
              </span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0 || pending}
                className="px-1 text-xs text-muted disabled:opacity-20"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === selected.length - 1 || pending}
                className="px-1 text-xs text-muted disabled:opacity-20"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => remove(id)}
                disabled={pending}
                className="px-2 text-sm text-bad disabled:opacity-40"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="card space-y-2">
        <h3 className="text-sm font-bold text-muted">種目を追加</h3>
        {groups.map((g) => {
          const avail = g.exercises.filter((e) => !selected.includes(e.id));
          if (avail.length === 0) return null;
          return (
            <div key={g.category}>
              <p className="mb-1 text-xs text-muted">{g.category}</p>
              <div className="flex flex-wrap gap-1.5">
                {avail.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => add(e.id)}
                    disabled={pending}
                    className="btn btn-sm disabled:opacity-40"
                  >
                    ＋ {e.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
