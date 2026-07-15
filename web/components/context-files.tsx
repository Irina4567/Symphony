"use client";

import { useState } from "react";
import { ChevronRight, FileCode2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContextFile } from "@/content/types";

export function ContextFiles({ files }: { files: ContextFile[] }) {
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function toggle(filePath: string) {
    if (openPath === filePath) {
      setOpenPath(null);
      return;
    }
    setOpenPath(filePath);
    if (contents[filePath] !== undefined) return;

    setLoadingPath(filePath);
    try {
      const res = await fetch(`/api/context-file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить файл");
      setContents((prev) => ({ ...prev, [filePath]: data.content }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [filePath]: err instanceof Error ? err.message : "Не удалось загрузить файл",
      }));
    } finally {
      setLoadingPath(null);
    }
  }

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-semibold">Файлы проекта</h3>
        <p className="mt-1 text-sm text-muted">
          Эти файлы уже есть в песочнице (ты их не редактируешь) — загляни в них, прежде чем
          писать код ниже.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {files.map((file) => {
          const isOpen = openPath === file.path;
          return (
            <li key={file.path}>
              <button
                type="button"
                onClick={() => toggle(file.path)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-surface-muted"
              >
                <ChevronRight
                  size={14}
                  className={cn("shrink-0 text-muted transition-transform", isOpen && "rotate-90")}
                />
                <FileCode2 size={14} className="shrink-0 text-muted" />
                <code className="flex-1 truncate">{file.path}</code>
                {file.description && (
                  <span className="hidden shrink-0 text-xs text-muted sm:inline">{file.description}</span>
                )}
                {loadingPath === file.path && <Loader2 size={14} className="shrink-0 animate-spin text-muted" />}
              </button>
              {isOpen && (
                <div className="border-t border-border bg-background px-4 py-3">
                  {errors[file.path] && (
                    <p className="flex items-center gap-1.5 text-sm text-danger">
                      <AlertTriangle size={14} /> {errors[file.path]}
                    </p>
                  )}
                  {contents[file.path] !== undefined && (
                    <pre className="thin-scrollbar max-h-96 overflow-auto rounded-lg bg-surface-muted p-3 font-mono text-xs">
                      {contents[file.path]}
                    </pre>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
