"use client";

import { Menu } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { ProgressIO } from "./progress-io";
import { ProgressBar } from "./ui/progress-bar";
import { useProgress } from "@/lib/progress";

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { overallProgress, hydrated } = useProgress();
  const { done, total } = overallProgress();
  const pct = total > 0 ? (done / total) * 100 : 0;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground md:hidden"
        aria-label="Открыть меню"
      >
        <Menu size={18} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="hidden text-sm text-muted sm:inline">Прогресс курса</span>
        <div className="w-32 sm:w-48">
          <ProgressBar value={pct} />
        </div>
        {hydrated && (
          <span className="whitespace-nowrap text-xs text-muted">
            {done}/{total} уроков
          </span>
        )}
      </div>

      <ProgressIO />
      <ThemeToggle />
    </header>
  );
}
