import { notFound } from "next/navigation";
import { Info, FlaskConical } from "lucide-react";
import { getBlock } from "@/content/manifest";
import { ProjectSteps } from "@/components/project-steps";
import { LessonList } from "@/components/lesson-list";
import { CodeExercise } from "@/components/code-exercise";

export default async function BlockPage({ params }: { params: Promise<{ block: string }> }) {
  const { block: blockSlug } = await params;
  const block = getBlock(blockSlug);
  if (!block) notFound();

  const { miniProject } = block;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm font-medium text-accent">Блок курса</p>
      <h1 className="mt-1 text-3xl font-bold">{block.title}</h1>
      <p className="mt-3 text-muted">{block.description}</p>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Уроки</h2>
        <LessonList blockSlug={block.slug} lessons={block.lessons} />
      </div>

      <div
        id="mini-project"
        className="mt-10 scroll-mt-20 rounded-xl border border-accent/30 bg-accent/5 p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Мини-проект блока
        </p>
        <h2 className="mt-1 text-xl font-semibold">{miniProject.title}</h2>
        <p className="mt-2 text-sm text-muted">{miniProject.description}</p>

        <div className="mt-4 flex gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-muted">
          <Info size={16} className="mt-0.5 shrink-0 text-accent" />
          <p>{miniProject.note}</p>
        </div>

        <div className="mt-6">
          <ProjectSteps projectKey={`${block.slug}/mini-project`} steps={miniProject.steps} />
        </div>

        {miniProject.practiceExerciseId && (
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <FlaskConical size={16} className="text-accent" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">
                Практика: проверяется прямо здесь
              </h3>
            </div>
            <CodeExercise exerciseId={miniProject.practiceExerciseId} />
          </div>
        )}
      </div>
    </div>
  );
}
