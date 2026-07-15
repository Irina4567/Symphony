"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { manifest } from "@/content/manifest";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { Check, BookOpen } from "lucide-react";

export function SidebarNav({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { isLessonComplete, blockProgress, hydrated } = useProgress();

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "thin-scrollbar fixed inset-y-0 left-0 z-50 w-72 shrink-0 overflow-y-auto border-r border-border bg-surface px-4 py-5 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Link
          href="/"
          className="mb-6 flex items-center gap-2 px-2 text-base font-semibold"
          onClick={onClose}
        >
          <BookOpen size={18} className="text-accent" />
          Symfony курс
        </Link>

        <nav className="space-y-6">
          {manifest.map((block) => {
            const progress = blockProgress(block.slug);
            return (
              <div key={block.slug}>
                <div className="mb-2 flex items-center justify-between px-2">
                  <Link
                    href={`/blocks/${block.slug}`}
                    onClick={onClose}
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground",
                      pathname === `/blocks/${block.slug}` && "text-foreground"
                    )}
                  >
                    {block.title}
                  </Link>
                  {hydrated && (
                    <span className="text-[11px] text-muted">
                      {progress.done}/{progress.total}
                    </span>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {block.lessons.map((lesson) => {
                    const href = `/blocks/${block.slug}/${lesson.slug}`;
                    const active = pathname === href;
                    const done = hydrated && isLessonComplete(block.slug, lesson.slug);
                    return (
                      <li key={lesson.slug}>
                        <Link
                          href={href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                            active
                              ? "bg-accent/10 text-accent"
                              : "text-foreground/80 hover:bg-surface-muted hover:text-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
                              done
                                ? "border-success bg-success/20 text-success"
                                : "border-border text-transparent"
                            )}
                          >
                            {done && <Check size={10} />}
                          </span>
                          <span className="truncate">{lesson.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                  <li>
                    <Link
                      href={`/blocks/${block.slug}#mini-project`}
                      onClick={onClose}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm italic text-muted hover:bg-surface-muted hover:text-foreground"
                    >
                      Мини-проект
                    </Link>
                  </li>
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
