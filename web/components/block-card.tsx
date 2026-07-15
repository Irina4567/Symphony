"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { ProgressBar } from "./ui/progress-bar";
import type { BlockManifestEntry } from "@/content/types";

export function BlockCard({ block, index }: { block: BlockManifestEntry; index: number }) {
  const { blockProgress, hydrated } = useProgress();
  const { done, total } = blockProgress(block.slug);
  const pct = total > 0 ? (done / total) * 100 : 0;

  return (
    <Link
      href={`/blocks/${block.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/50"
    >
      <div className="flex items-center justify-between">
        <span className="flex size-7 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-muted">
          {index + 1}
        </span>
        <ArrowRight
          size={16}
          className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </div>
      <h3 className="mt-3 font-semibold">{block.title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-muted">{block.description}</p>
      <div className="mt-4">
        <ProgressBar value={pct} />
        {hydrated && (
          <p className="mt-1.5 text-xs text-muted">
            {done}/{total} уроков · {block.lessons.length} + мини-проект
          </p>
        )}
      </div>
    </Link>
  );
}
