import { NextResponse } from "next/server";
import { z } from "zod";
import { getExercise } from "@/content/exercises";
import type { Check, HttpCheck } from "@/content/types";

const SANDBOX_URL = process.env.SANDBOX_URL ?? "http://localhost:4000";

const requestSchema = z.object({
  exerciseId: z.string(),
  code: z.string().min(1).max(20_000),
});

interface CheckResult {
  description: string;
  passed: boolean;
}

function evaluateStdoutCheck(check: Check, stdout: string): CheckResult {
  switch (check.type) {
    case "stdout-exact":
      return { description: check.description, passed: stdout.trim() === check.value.trim() };
    case "stdout-contains":
      return { description: check.description, passed: stdout.includes(check.value) };
    case "stdout-matches":
      return {
        description: check.description,
        passed: new RegExp(check.pattern, check.flags).test(stdout),
      };
  }
}

function evaluateHttpCheck(
  check: HttpCheck,
  requestResults: Map<string, { status: number | null; body: string }>
): CheckResult {
  const result = requestResults.get(check.requestId);
  if (!result) return { description: check.description, passed: false };
  switch (check.type) {
    case "http-status":
      return { description: check.description, passed: result.status === check.expectedStatus };
    case "http-body-contains":
      return { description: check.description, passed: result.body.includes(check.value) };
    case "http-body-not-contains":
      return { description: check.description, passed: !result.body.includes(check.value) };
    case "http-body-matches":
      return {
        description: check.description,
        passed: new RegExp(check.pattern, check.flags).test(result.body),
      };
  }
}

async function callSandbox(payload: unknown, timeoutMs: number) {
  const response = await fetch(`${SANDBOX_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error("sandbox-error");
  }
  return response.json();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const exercise = getExercise(parsed.data.exerciseId);
  if (!exercise) {
    return NextResponse.json({ error: "Упражнение не найдено" }, { status: 404 });
  }

  if (exercise.mode === "plain-php") {
    let sandboxResult: { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean };
    try {
      sandboxResult = await callSandbox({ mode: "plain-php", code: parsed.data.code }, 15_000);
    } catch {
      return NextResponse.json(
        { error: `Не удалось связаться с песочницей на ${SANDBOX_URL}. Запущен ли sandbox-сервис?` },
        { status: 502 }
      );
    }

    const checkResults = exercise.checks.map((check) => evaluateStdoutCheck(check, sandboxResult.stdout));
    return NextResponse.json({
      mode: "plain-php",
      stdout: sandboxResult.stdout,
      stderr: sandboxResult.stderr,
      exitCode: sandboxResult.exitCode,
      timedOut: sandboxResult.timedOut,
      checksPassed: checkResults.every((result) => result.passed),
      checkResults,
    });
  }

  // symfony-app: targetPath и requests идут из определения упражнения на сервере,
  // от клиента принимаем только сам код — так же, как checks никогда не приходят от клиента.
  let sandboxResult: {
    requests: { id: string; status: number | null; body: string }[];
    stderr: string;
    timedOut: boolean;
  };
  try {
    sandboxResult = await callSandbox(
      {
        mode: "symfony-app",
        code: parsed.data.code,
        targetPath: exercise.targetPath,
        requests: exercise.requests,
        setupCommands: exercise.setupCommands,
        fixtureOverrides: exercise.fixtureOverrides,
      },
      35_000
    );
  } catch {
    return NextResponse.json(
      { error: `Не удалось связаться с песочницей на ${SANDBOX_URL}. Запущен ли sandbox-сервис?` },
      { status: 502 }
    );
  }

  const resultsById = new Map(sandboxResult.requests.map((result) => [result.id, result]));
  const checkResults = exercise.checks.map((check) => evaluateHttpCheck(check, resultsById));
  const requestsForClient = exercise.requests.map((spec) => {
    const result = resultsById.get(spec.id);
    return {
      id: spec.id,
      method: spec.method,
      path: spec.path,
      status: result?.status ?? null,
      body: result?.body ?? "",
    };
  });

  return NextResponse.json({
    mode: "symfony-app",
    requests: requestsForClient,
    stderr: sandboxResult.stderr,
    timedOut: sandboxResult.timedOut,
    checksPassed: checkResults.every((result) => result.passed),
    checkResults,
  });
}
