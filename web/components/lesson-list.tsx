"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { LessonManifestEntry } from "@/content/types";

export function LessonList({
  blockSlug,
  lessons,
}: {
  blockSlug: string;
  lessons: LessonManifestEntry[];
}) {
  const { isLessonComplete, hydrated } = useProgress();

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {lessons.map((lesson, index) => {
        const done = hydrated && isLessonComplete(blockSlug, lesson.slug);
        return (
          <li key={lesson.slug}>
            <Link
              href={`/blocks/${blockSlug}/${lesson.slug}`}
              className="flex items-center gap-4 bg-surface px-4 py-3.5 transition-colors hover:bg-surface-muted"
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  done ? "border-success bg-success/15 text-success" : "border-border text-muted"
                )}
              >
                {done ? <Check size={12} /> : index + 1}
              </span>
              <span className="flex-1 text-sm font-medium">{lesson.title}</span>
              <span className="text-xs text-muted">{lesson.estimatedMinutes} мин</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
