import type { ComponentType } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getAllLessonParams, getBlock, getLessonMeta, getAdjacentLessons } from "@/content/manifest";
import { LessonCompleteButton } from "@/components/lesson-complete-button";

export function generateStaticParams() {
  return getAllLessonParams();
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ block: string; lesson: string }>;
}) {
  const { block: blockSlug, lesson: lessonSlug } = await params;
  const block = getBlock(blockSlug);
  const lessonMeta = getLessonMeta(blockSlug, lessonSlug);
  if (!block || !lessonMeta) notFound();

  let LessonContent: ComponentType;
  try {
    const mod = await import(`@/content/blocks/${blockSlug}/${lessonSlug}.mdx`);
    LessonContent = mod.default;
  } catch {
    notFound();
  }

  const { prev, next } = getAdjacentLessons(blockSlug, lessonSlug);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center gap-2 text-sm text-muted">
        <Link href={`/blocks/${blockSlug}`} className="hover:text-foreground">
          {block.title}
        </Link>
        <span>/</span>
        <span>{lessonMeta.title}</span>
      </div>

      <h1 className="text-3xl font-bold">{lessonMeta.title}</h1>
      <p className="mt-1 text-sm text-muted">≈ {lessonMeta.estimatedMinutes} минут</p>

      <article className="prose prose-lesson dark:prose-invert mt-8">
        <LessonContent />
      </article>

      <LessonCompleteButton blockSlug={blockSlug} lessonSlug={lessonSlug} />

      <div className="mt-10 flex items-center justify-between border-t border-border pt-6 text-sm">
        {prev ? (
          <Link
            href={`/blocks/${prev.block}/${prev.lesson.slug}`}
            className="flex items-center gap-1.5 text-muted hover:text-foreground"
          >
            <ArrowLeft size={14} /> {prev.lesson.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/blocks/${next.block}/${next.lesson.slug}`}
            className="flex items-center gap-1.5 text-accent hover:opacity-80"
          >
            {next.lesson.title} <ArrowRight size={14} />
          </Link>
        ) : (
          <Link
            href={`/blocks/${blockSlug}#mini-project`}
            className="flex items-center gap-1.5 text-accent hover:opacity-80"
          >
            К мини-проекту <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}
