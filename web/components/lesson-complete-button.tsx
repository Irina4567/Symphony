"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { useProgress } from "@/lib/progress";

export function LessonCompleteButton({
  blockSlug,
  lessonSlug,
}: {
  blockSlug: string;
  lessonSlug: string;
}) {
  const { isLessonComplete, markLessonComplete, hydrated } = useProgress();
  const done = hydrated && isLessonComplete(blockSlug, lessonSlug);

  return (
    <div className="mt-8">
      <Button
        variant={done ? "secondary" : "primary"}
        onClick={() => markLessonComplete(blockSlug, lessonSlug)}
        disabled={done}
      >
        <CheckCircle2 size={16} />
        {done ? "Урок пройден" : "Отметить урок пройденным"}
      </Button>
    </div>
  );
}
