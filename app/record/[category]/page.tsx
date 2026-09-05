import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui";
import { getExercisesByCategory } from "@/lib/queries";
import { todayStr } from "@/lib/date";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/record/[category]">) {
  const { category: raw } = await params;
  const sp = await searchParams;
  const category = decodeURIComponent(raw);
  const exercises = await getExercisesByCategory(category);
  if (exercises.length === 0) notFound();

  const date =
    typeof sp.date === "string" && DATE_RE.test(sp.date) && sp.date !== todayStr()
      ? sp.date
      : null;
  const q = date ? `?date=${date}` : "";

  return (
    <div className="space-y-4">
      <BackLink
        href={date ? `/record?date=${date}` : "/record"}
        label={date ? "その日の記録" : "大分類"}
      />
      <h1 className="text-lg font-bold">{category}</h1>
      <ul className="space-y-2">
        {exercises.map((e) => (
          <li key={e.id}>
            <Link
              href={`/record/exercise/${e.id}${q}`}
              className="btn w-full justify-between py-4"
            >
              {e.name}
              <span className="text-muted">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
