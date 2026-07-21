import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const DOCKER_IMAGE = "symfony-app-sandbox";
const OVERALL_TIMEOUT_MS = 20_000;
const SETUP_COMMAND_TIMEOUT_MS = 8000;
const PHPUNIT_TIMEOUT_MS = 12_000;
const MAX_OUTPUT_BYTES = 32 * 1024;
const JUNIT_REPORT_PATH = "/tmp/phpunit-results.xml";

export interface PhpUnitTestCaseResult {
  name: string;
  passed: boolean;
  message?: string;
}

export interface SymfonyPhpUnitRunResult {
  tests: PhpUnitTestCaseResult[];
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

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// PHPUnit --log-junit выдаёт предсказуемую плоскую структуру (мы сами фиксируем версию
// PHPUnit в образе), поэтому лёгкий регекс-парсер надёжнее, чем тянуть отдельную
// XML-библиотеку ради десятка тегов.
function parseJUnitXml(xml: string): PhpUnitTestCaseResult[] {
  const results: PhpUnitTestCaseResult[] = [];
  const testcaseRegex = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  let match: RegExpExecArray | null;

  while ((match = testcaseRegex.exec(xml)) !== null) {
    const attrs = match[1];
    const inner = match[2] ?? "";
    const nameMatch = /\bname="([^"]*)"/.exec(attrs);
    const name = nameMatch ? decodeXmlEntities(nameMatch[1]) : "unknown";

    const problemMatch = /<(?:failure|error)\b[^>]*>([\s\S]*?)<\/(?:failure|error)>/.exec(inner);
    if (problemMatch) {
      results.push({ name, passed: false, message: decodeXmlEntities(problemMatch[1]).trim() });
    } else {
      results.push({ name, passed: true });
    }
  }

  return results;
}

// Оркестрация похожа на symfony-app-runner.ts, но вместо цепочки curl-запросов к
// поднятому php -S — один вызов bin/phpunit по конкретному файлу, а результат — не
// HTTP-ответы, а pass/fail по каждому тест-методу из JUnit-отчёта. Живой сервер приложения
// тут не нужен: и юнит-тесты, и WebTestCase (через in-process клиент) обходятся без него.
export async function runSymfonyPhpUnit(input: {
  code: string;
  targetPath: string;
  setupCommands?: string[];
  fixtureOverrides?: { path: string; content: string }[];
}): Promise<SymfonyPhpUnitRunResult> {
  const dir = await mkdtemp(join(tmpdir(), "symfony-course-phpunit-"));
  const codeFile = join(dir, "code.php");
  await writeFile(codeFile, input.code, "utf8");

  const containerName = `sandbox-phpunit-${randomUUID()}`;
  let timedOut = false;
  const overallTimer = setTimeout(() => {
    timedOut = true;
    spawn("docker", ["kill", containerName], { stdio: "ignore" });
  }, OVERALL_TIMEOUT_MS);

  let stderr = "";
  let tests: PhpUnitTestCaseResult[] = [];

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
        tests: [],
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
      // phpunit.dist.xml форсирует APP_ENV=test через <server force="true">, но образ задаёт
      // ENV APP_ENV=dev на уровне контейнера — этот уровень оказывается "сильнее" к моменту,
      // когда tests/bootstrap.php читает $_SERVER['APP_ENV'], так что APP_ENV=test приходится
      // явно передавать сюда же, а не полагаться только на конфиг phpunit.
      const phpunit = await run(
        "docker",
        [
          "exec",
          containerName,
          "sh",
          "-c",
          `APP_ENV=test php bin/phpunit --log-junit ${JUNIT_REPORT_PATH} ${targetPath}`,
        ],
        PHPUNIT_TIMEOUT_MS
      );

      const cat = await run("docker", ["exec", containerName, "cat", JUNIT_REPORT_PATH], 3000);
      if (cat.exitCode === 0 && cat.stdout.includes("<testcase")) {
        tests = parseJUnitXml(cat.stdout);
      } else {
        // JUnit-отчёт не создался — обычно синтаксическая ошибка в файле ученика. Показываем
        // сырой вывод phpunit как есть, тем же способом, что и фатальные ошибки в других режимах.
        stderr += truncate(`${phpunit.stdout}\n${phpunit.stderr}`, MAX_OUTPUT_BYTES);
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

  return { tests, stderr: truncate(stderr, MAX_OUTPUT_BYTES), timedOut };
}
