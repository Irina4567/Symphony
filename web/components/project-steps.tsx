"use client";

import { useState } from "react";
import { Check, Copy, CopyCheck } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { MiniProjectStep } from "@/content/types";

function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // буфер обмена недоступен (нет разрешения/не https) — молча игнорируем
    }
  }

  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-[#0b0f17] px-3 py-2 font-mono text-xs text-slate-200">
      <code className="overflow-x-auto whitespace-pre">{command}</code>
      <button
        type="button"
        onClick={handleCopy}
        className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
        aria-label="Скопировать команду"
      >
        {copied ? <CopyCheck size={13} /> : <Copy size={13} />}
        {copied ? "Скопировано" : "Копировать"}
      </button>
    </div>
  );
}

export function ProjectSteps({
  projectKey,
  steps,
}: {
  projectKey: string;
  steps: MiniProjectStep[];
}) {
  const { isChecklistItemDone, toggleChecklistItem, hydrated } = useProgress();
  const done = steps.filter((step) => hydrated && isChecklistItemDone(projectKey, step.id)).length;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <p className="text-sm font-medium text-muted">
          {done}/{steps.length} шагов отмечено
        </p>
      </div>
      <ol className="space-y-3">
        {steps.map((step, index) => {
          const checked = hydrated && isChecklistItemDone(projectKey, step.id);
          return (
            <li
              key={step.id}
              className={cn(
                "rounded-xl border px-4 py-3.5 transition-colors",
                checked ? "border-success/30 bg-success/5" : "border-border bg-surface"
              )}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
                    checked
                      ? "border-success bg-success text-background"
                      : "border-border text-muted"
                  )}
                >
                  {checked ? <Check size={12} strokeWidth={3} /> : index + 1}
                </span>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={checked}
                  onChange={() => toggleChecklistItem(projectKey, step.id)}
                />
                <span className="flex-1">
                  <span className={cn("text-sm font-semibold", checked && "text-muted line-through")}>
                    {step.title}
                  </span>
                  <p className="mt-1 text-sm text-muted">{step.description}</p>
                </span>
              </label>

              {step.command && (
                <div className="ml-8">
                  <CommandBlock command={step.command} />
                </div>
              )}

              {step.expectedResult && (
                <p className="ml-8 mt-2 text-xs text-muted">
                  <span className="font-medium text-foreground/80">Как понять, что получилось: </span>
                  {step.expectedResult}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
