import { BackLink } from "@/components/ui";
import { getAllExercises, getTemplates } from "@/lib/queries";
import { ExerciseAdmin } from "@/components/ExerciseAdmin";
import { TemplateSection } from "@/components/TemplateSection";

export const dynamic = "force-dynamic";

const DEFAULT_CATEGORIES = ["胸", "背中", "脚", "肩", "腕", "その他"];

export default async function SettingsPage() {
  const [groups, templates] = await Promise.all([
    getAllExercises(),
    getTemplates(),
  ]);
  const categories = [
    ...new Set([...DEFAULT_CATEGORIES, ...groups.map((g) => g.category)]),
  ];

  return (
    <div className="space-y-6">
      <BackLink href="/" label="トップ" />
      <h1 className="text-lg font-bold">設定</h1>

      <section className="space-y-3">
        <h2 className="font-bold">種目</h2>
        <ExerciseAdmin groups={groups} categories={categories} />
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">メニューテンプレート</h2>
        <TemplateSection
          templates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            exerciseNames: t.exercises.map((e) => e.exercise.name),
          }))}
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">データ</h2>
        <a href="/api/export" className="btn w-full">
          ⬇ トレーニング記録 CSV
        </a>
        <a href="/api/export?type=bodyweight" className="btn w-full">
          ⬇ 体重記録 CSV
        </a>
      </section>

      <section className="card text-xs text-muted">
        <p className="mb-1 font-bold text-foreground">認証について</p>
        <p>
          公開時は環境変数 <code>BASIC_AUTH_USER</code> /{" "}
          <code>BASIC_AUTH_PASSWORD</code> を設定すると Basic 認証が有効になります。
        </p>
      </section>
    </div>
  );
}
