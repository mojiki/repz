import Link from "next/link";
import { BackLink } from "@/components/ui";
import { getCategoriesWithCounts, getTemplates } from "@/lib/queries";
import { formatShort, todayStr } from "@/lib/date";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function RecordPage({
  searchParams,
}: PageProps<"/record">) {
  const sp = await searchParams;
  const date =
    typeof sp.date === "string" && DATE_RE.test(sp.date) && sp.date !== todayStr()
      ? sp.date
      : null;
  const q = date ? `?date=${date}` : "";

  const [cats, templates] = await Promise.all([
    getCategoriesWithCounts(),
    getTemplates(),
  ]);

  return (
    <div className="space-y-4">
      <BackLink href={date ? `/session/${date}` : "/"} label={date ? "その日の記録" : "トップ"} />
      <h1 className="text-lg font-bold">
        記録する
        {date && <span className="ml-2 text-sm text-muted">{formatShort(date)}</span>}
      </h1>

      {!date && templates.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-muted">メニューから選ぶ</h2>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/record/template/${t.id}`}
                className="btn btn-sm justify-start"
              >
                📋 {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-muted">大分類から選ぶ</h2>
        <div className="grid grid-cols-2 gap-3">
          {cats.map((c) => (
            <Link
              key={c.category}
              href={`/record/${encodeURIComponent(c.category)}${q}`}
              className="btn py-5 text-lg"
            >
              {c.category}
              <span className="text-xs text-muted">{c.count}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
