import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui";
import { getAllExercises, getTemplate } from "@/lib/queries";
import { TemplateEditor } from "@/components/TemplateEditor";

export const dynamic = "force-dynamic";

export default async function TemplateEditPage({
  params,
}: PageProps<"/settings/templates/[id]">) {
  const { id } = await params;
  const tid = Number(id);
  const [template, groups] = await Promise.all([
    getTemplate(tid),
    getAllExercises(),
  ]);
  if (!template) notFound();

  return (
    <div className="space-y-4">
      <BackLink href="/settings" label="設定" />
      <TemplateEditor
        templateId={tid}
        name={template.name}
        selectedIds={template.exercises.map((e) => e.exerciseId)}
        groups={groups.map((g) => ({
          category: g.category,
          exercises: g.exercises.map((e) => ({ id: e.id, name: e.name })),
        }))}
      />
    </div>
  );
}
