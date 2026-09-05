import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui";
import { getTemplate } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TemplateRecordPage({
  params,
}: PageProps<"/record/template/[id]">) {
  const { id } = await params;
  const template = await getTemplate(Number(id));
  if (!template) notFound();

  return (
    <div className="space-y-4">
      <BackLink href="/record" label="記録する" />
      <h1 className="text-lg font-bold">📋 {template.name}</h1>
      <p className="text-sm text-muted">種目を順番に記録していきます</p>
      <ul className="space-y-2">
        {template.exercises.map((te) => (
          <li key={te.id}>
            <Link
              href={`/record/exercise/${te.exerciseId}`}
              className="btn w-full justify-between py-4"
            >
              <span>
                <span className="chip mr-2">{te.exercise.category}</span>
                {te.exercise.name}
              </span>
              <span className="text-muted">→</span>
            </Link>
          </li>
        ))}
        {template.exercises.length === 0 && (
          <li className="text-sm text-muted">
            このメニューには種目が登録されていません（設定から追加）
          </li>
        )}
      </ul>
    </div>
  );
}
