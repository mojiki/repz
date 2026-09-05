"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addExercise,
  deleteExercise,
  moveExercise,
  renameExercise,
} from "@/app/actions";

type Ex = { id: number; name: string; category: string };
type Group = { category: string; exercises: Ex[] };

export function ExerciseAdmin({
  groups,
  categories,
}: {
  groups: Group[];
  categories: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const [newCat, setNewCat] = useState(categories[0] ?? "胸");
  const [newName, setNewName] = useState("");

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <h3 className="text-sm font-bold text-muted">種目を追加</h3>
        <div className="flex gap-2">
          <select
            className="field"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className="field"
            placeholder="種目名"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={pending || !newName.trim()}
          onClick={() =>
            run(async () => {
              await addExercise(newCat, newName);
              setNewName("");
            })
          }
          className="btn btn-sm btn-primary disabled:opacity-40"
        >
          追加
        </button>
      </div>

      {groups.map((g) => (
        <div key={g.category} className="card space-y-1">
          <h3 className="mb-1 text-sm font-bold text-muted">{g.category}</h3>
          {g.exercises.map((ex, i) => (
            <Row
              key={ex.id}
              ex={ex}
              first={i === 0}
              last={i === g.exercises.length - 1}
              pending={pending}
              onRename={(name) => run(() => renameExercise(ex.id, name))}
              onMove={(dir) => run(() => moveExercise(ex.id, dir))}
              onDelete={() =>
                run(() => deleteExercise(ex.id))
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Row({
  ex,
  first,
  last,
  pending,
  onRename,
  onMove,
  onDelete,
}: {
  ex: Ex;
  first: boolean;
  last: boolean;
  pending: boolean;
  onRename: (name: string) => void;
  onMove: (dir: "up" | "down") => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(ex.name);
  const dirty = name.trim() !== ex.name && name.trim().length > 0;

  return (
    <div className="flex items-center gap-1 border-t border-border py-1.5 first:border-0">
      <div className="flex flex-col">
        <button
          type="button"
          disabled={first || pending}
          onClick={() => onMove("up")}
          className="px-1 text-xs text-muted disabled:opacity-20"
        >
          ▲
        </button>
        <button
          type="button"
          disabled={last || pending}
          onClick={() => onMove("down")}
          className="px-1 text-xs text-muted disabled:opacity-20"
        >
          ▼
        </button>
      </div>
      <input
        className="field flex-1 !py-1.5 text-sm"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => dirty && onRename(name)}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm(`「${ex.name}」を削除しますか?\n※過去の記録も削除されます`))
            onDelete();
        }}
        className="px-2 text-sm text-bad disabled:opacity-40"
      >
        ×
      </button>
    </div>
  );
}
