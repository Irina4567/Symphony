import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const DOCKER_IMAGE = "symfony-app-sandbox";
const OVERALL_TIMEOUT_MS = 20_000;
const SETUP_COMMAND_TIMEOUT_MS = 8000;
const INVOCATION_TIMEOUT_MS = 6000;
const MAX_OUTPUT_BYTES = 32 * 1024;

export interface ConsoleInvocationSpec {
  id: string;
  args: string[];
}

export interface ConsoleInvocationResult {
  id: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface SymfonyConsoleRunResult {
  invocations: ConsoleInvocationResult[];
  stderr: string;
  timedOut: boolean;
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n… (вывод обрезан)`;
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        exitCode,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout: "", stderr: `Не удалось запустить docker: ${err.message}`, exitCode: null });
    });
  });
}

// Оркестрация похожа на symfony-phpunit-runner.ts: код ученика (один файл — класс команды)
// копируется в тот же Symfony-скелет, setupCommands выполняются один раз, а дальше вместо
// HTTP-запросов или phpunit — последовательность вызовов `php bin/console <args>` прямо через
// docker exec (аргументы передаются как argv, не через shell, так что экранирование не нужно —
// они всегда заданы автором упражнения на сервере, а не учеником). Живой сервер приложения не
// нужен: консольные команды не обслуживают HTTP.
export async function runSymfonyConsole(input: {
  code: string;
  targetPath: string;
  invocations: ConsoleInvocationSpec[];
  setupCommands?: string[];
  fixtureOverrides?: { path: string; content: string }[];
}): Promise<SymfonyConsoleRunResult> {
  const dir = await mkdtemp(join(tmpdir(), "symfony-course-console-"));
  const codeFile = join(dir, "code.php");
  await writeFile(codeFile, input.code, "utf8");

  const containerName = `sandbox-console-${randomUUID()}`;
  let timedOut = false;
  const overallTimer = setTimeout(() => {
    timedOut = true;
    spawn("docker", ["kill", containerName], { stdio: "ignore" });
  }, OVERALL_TIMEOUT_MS);

  let stderr = "";
  const invocationResults: ConsoleInvocationResult[] = [];

  try {
    const started = await run(
      "docker",
      [
        "run",
        "-d",
        "--name",
        containerName,
        "--network",
        "none",
        "--memory",
        "256m",
        "--memory-swap",
        "256m",
        "--cpus",
        "1",
        "--pids-limit",
        "128",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        DOCKER_IMAGE,
        "sleep",
        "30",
      ],
      8000
    );

    if (started.exitCode !== 0) {
      return {
        invocations: [],
        stderr: truncate(started.stderr || "Не удалось запустить контейнер песочницы", MAX_OUTPUT_BYTES),
        timedOut: false,
      };
    }

    const targetPath = `/skeleton/${input.targetPath.replace(/^\/+/, "")}`;
    const cp = await run("docker", ["cp", codeFile, `${containerName}:${targetPath}`], 5000);
    if (cp.exitCode !== 0) {
      stderr += `Не удалось поместить код в проект: ${cp.stderr}\n`;
    }

    for (const override of input.fixtureOverrides ?? []) {
      const overrideFile = join(dir, `override-${randomUUID()}.txt`);
      await writeFile(overrideFile, override.content, "utf8");
      const overrideTargetPath = `/skeleton/${override.path.replace(/^\/+/, "")}`;
      const overrideCp = await run(
        "docker",
        ["cp", overrideFile, `${containerName}:${overrideTargetPath}`],
        5000
      );
      if (overrideCp.exitCode !== 0) {
        stderr += `Не удалось поместить ${override.path} в проект: ${overrideCp.stderr}\n`;
      }
    }

    let setupFailed = false;
    for (const command of input.setupCommands ?? []) {
      const setup = await run(
        "docker",
        ["exec", containerName, "sh", "-c", `cd /skeleton && ${command}`],
        SETUP_COMMAND_TIMEOUT_MS
      );
      if (setup.exitCode !== 0) {
        stderr += `Ошибка на шаге настройки (${command}):\n${setup.stdout}\n${setup.stderr}\n`;
        setupFailed = true;
        break;
      }
    }

    if (!setupFailed) {
      for (const invocation of input.invocations) {
        const res = await run(
          "docker",
          ["exec", containerName, "php", "bin/console", ...invocation.args],
          INVOCATION_TIMEOUT_MS
        );
        invocationResults.push({
          id: invocation.id,
          exitCode: res.exitCode,
          stdout: truncate(res.stdout, MAX_OUTPUT_BYTES),
          stderr: truncate(res.stderr, MAX_OUTPUT_BYTES),
        });
      }
    }
  } finally {
    clearTimeout(overallTimer);
    await run("docker", ["rm", "-f", containerName], 8000);
    await rm(dir, { recursive: true, force: true });
  }

  if (timedOut) {
    stderr += `Превышено общее время выполнения (${OVERALL_TIMEOUT_MS}мс).\n`;
  }

  return { invocations: invocationResults, stderr: truncate(stderr, MAX_OUTPUT_BYTES), timedOut };
}
