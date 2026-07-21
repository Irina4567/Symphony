"use client";

import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Play, RotateCcw, Lightbulb, Loader2, CheckCircle2, XCircle, FileCode2 } from "lucide-react";
import { Button } from "./ui/button";
import { ContextFiles } from "./context-files";
import { useProgress } from "@/lib/progress";
import { getExercise } from "@/content/exercises";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";

interface CheckResult {
  description: string;
  passed: boolean;
  detail?: string;
}

type RunResponse =
  | {
      mode: "plain-php";
      stdout: string;
      stderr: string;
      exitCode: number | null;
      timedOut: boolean;
      checksPassed: boolean;
      checkResults: CheckResult[];
    }
  | {
      mode: "symfony-app";
      requests: { id: string; method: string; path: string; status: number | null; body: string }[];
      stderr: string;
      timedOut: boolean;
      checksPassed: boolean;
      checkResults: CheckResult[];
    }
  | {
      mode: "symfony-phpunit";
      stderr: string;
      timedOut: boolean;
      checksPassed: boolean;
      checkResults: CheckResult[];
    }
  | {
      mode: "symfony-console";
      invocations: { id: string; args: string[]; exitCode: number | null; stdout: string; stderr: string }[];
      stderr: string;
      timedOut: boolean;
      checksPassed: boolean;
      checkResults: CheckResult[];
    };

function statusColor(status: number | null): string {
  if (status === null) return "text-slate-400";
  if (status >= 200 && status < 300) return "text-success";
  if (status >= 400) return "text-danger";
  return "text-warning";
}

function CheckList({ checks }: { checks: CheckResult[] }) {
  return (
    <div className="space-y-1.5 border-t border-slate-700 pt-2">
      {checks.map((check, i) => (
        <div key={i} className={cn(check.passed ? "text-success" : "text-danger")}>
          <div className="flex items-start gap-2">
            {check.passed ? (
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={14} className="mt-0.5 shrink-0" />
            )}
            <span className="font-mono">{check.description}</span>
          </div>
          {!check.passed && check.detail && (
            <pre className="ml-6 mt-1 whitespace-pre-wrap break-words text-slate-400">{check.detail}</pre>
          )}
        </div>
      ))}
    </div>
  );
}

export function CodeExercise({ exerciseId }: { exerciseId: string }) {
  const exercise = getExercise(exerciseId);
  const { resolvedTheme } = useTheme();
  const { markExerciseComplete, isExerciseComplete } = useProgress();

  const draftKey = `symphony-course-draft-${exerciseId}`;
  const [code, setCode] = useState(exercise?.starterCode ?? "");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const hydrated = useHydrated();

  useEffect(() => {
    // Единоразовая синхронизация с внешней системой (localStorage) при монтировании —
    // черновик кода, сохранённый в прошлый визит.
    try {
      const draft = window.localStorage.getItem(draftKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (draft) setCode(draft);
    } catch {
      // localStorage недоступен (приватный режим и т.п.) — просто работаем без черновика
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(draftKey, code);
  }, [code, draftKey, hydrated]);

  if (!exercise) {
    return (
      <div className="not-prose my-8 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
        Упражнение «{exerciseId}» не найдено.
      </div>
    );
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Что-то пошло не так");
        return;
      }
      setResult(data);
      if (data.checksPassed) {
        markExerciseComplete(exerciseId);
      }
    } catch {
      setError("Не удалось выполнить запрос. Проверьте, что sandbox-сервис запущен (npm run dev:sandbox).");
    } finally {
      setRunning(false);
    }
  }

  function handleReset() {
    setCode(exercise!.starterCode);
    setResult(null);
    setError(null);
    setShowSolution(false);
  }

  const done = isExerciseComplete(exerciseId);

  return (
    <>
      {(exercise.mode === "symfony-app" || exercise.mode === "symfony-phpunit" || exercise.mode === "symfony-console") &&
        exercise.contextFiles &&
        exercise.contextFiles.length > 0 && <ContextFiles files={exercise.contextFiles} exerciseId={exerciseId} />}
      <div className="not-prose my-8 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{exercise.title}</h3>
            {done && (
              <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                <CheckCircle2 size={12} /> выполнено
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">{exercise.description}</p>
        </div>

        {(exercise.mode === "symfony-app" || exercise.mode === "symfony-phpunit" || exercise.mode === "symfony-console") && (
          <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-4 py-1.5 text-xs text-muted">
            <FileCode2 size={13} />
            <code>{exercise.targetPath}</code>
          </div>
        )}

        <div className="h-72 border-b border-border">
          <Editor
            language="php"
            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
            value={code}
            onChange={(value) => setCode(value ?? "")}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 12 },
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <Button size="sm" onClick={handleRun} disabled={running}>
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Запустить
          </Button>
          <Button size="sm" variant="secondary" onClick={handleReset}>
            <RotateCcw size={14} />
            Сбросить
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSolution((v) => !v)}>
            <Lightbulb size={14} />
            {showSolution ? "Скрыть решение" : "Показать решение"}
          </Button>
        </div>

        {showSolution && (
          <div className="border-b border-border bg-surface-muted px-4 py-3 text-sm">
            {exercise.hint && <p className="mb-2 text-muted">Подсказка: {exercise.hint}</p>}
            <pre className="thin-scrollbar overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs">
              {exercise.solution}
            </pre>
          </div>
        )}

        <div className="thin-scrollbar max-h-80 overflow-y-auto bg-[#0b0f17] px-4 py-3 font-mono text-xs text-slate-200">
          {error && <p className="text-danger">{error}</p>}
          {!error && !result && !running && (
            <p className="text-slate-500">Нажми «Запустить», чтобы увидеть результат.</p>
          )}
          {running && <p className="text-slate-500">Выполняется…</p>}

          {result && result.mode === "plain-php" && (
            <div className="space-y-2">
              {result.stdout && <pre className="whitespace-pre-wrap">{result.stdout}</pre>}
              {result.stderr && <pre className="whitespace-pre-wrap text-danger">{result.stderr}</pre>}
              {!result.stdout && !result.stderr && (
                <p className="text-slate-500">(программа не вывела ничего в stdout)</p>
              )}
              <CheckList checks={result.checkResults} />
            </div>
          )}

          {result && result.mode === "symfony-app" && (
            <div className="space-y-2">
              {result.requests.map((req) => (
                <div key={req.id} className="rounded-lg border border-slate-700 bg-black/20 p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200">
                      {req.method}
                    </span>
                    <span className="text-slate-300">{req.path}</span>
                    <span className={cn("ml-auto shrink-0 font-semibold", statusColor(req.status))}>
                      {req.status ?? "нет ответа"}
                    </span>
                  </div>
                  {req.body && <pre className="mt-2 whitespace-pre-wrap break-words text-slate-300">{req.body}</pre>}
                </div>
              ))}
              {result.stderr && <pre className="whitespace-pre-wrap text-danger">{result.stderr}</pre>}
              <CheckList checks={result.checkResults} />
            </div>
          )}

          {result && result.mode === "symfony-phpunit" && (
            <div className="space-y-2">
              {result.stderr && <pre className="whitespace-pre-wrap text-danger">{result.stderr}</pre>}
              {!result.stderr && result.checkResults.length === 0 && (
                <p className="text-slate-500">PHPUnit не нашёл ни одного теста в этом файле.</p>
              )}
              <CheckList checks={result.checkResults} />
            </div>
          )}

          {result && result.mode === "symfony-console" && (
            <div className="space-y-2">
              {result.invocations.map((inv) => (
                <div key={inv.id} className="rounded-lg border border-slate-700 bg-black/20 p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">$ php bin/console {inv.args.join(" ")}</span>
                    <span
                      className={cn(
                        "ml-auto shrink-0 font-semibold",
                        inv.exitCode === 0 ? "text-success" : "text-danger"
                      )}
                    >
                      exit {inv.exitCode ?? "нет кода"}
                    </span>
                  </div>
                  {inv.stdout && <pre className="mt-2 whitespace-pre-wrap break-words text-slate-300">{inv.stdout}</pre>}
                  {inv.stderr && <pre className="mt-2 whitespace-pre-wrap break-words text-danger">{inv.stderr}</pre>}
                </div>
              ))}
              {result.stderr && <pre className="whitespace-pre-wrap text-danger">{result.stderr}</pre>}
              <CheckList checks={result.checkResults} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
