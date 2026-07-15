import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const DOCKER_IMAGE = "symfony-app-sandbox";
const OVERALL_TIMEOUT_MS = 20_000;
const SETUP_COMMAND_TIMEOUT_MS = 8000;
const MAX_OUTPUT_BYTES = 32 * 1024;
const SERVER_READY_TIMEOUT_MS = 4000;
const REQUEST_TIMEOUT_S = 3;
const STATUS_MARKER = "__SANDBOX_STATUS__";

export interface HttpRequestSpec {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: string;
  /** По умолчанию application/json. Для form-urlencoded передайте
   *  "application/x-www-form-urlencoded". */
  contentType?: string;
}

export interface HttpRequestResult {
  id: string;
  status: number | null;
  body: string;
}

export interface SymfonyAppRunResult {
  requests: HttpRequestResult[];
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

// Одноразовый контейнер с реальным Symfony-скелетом: код ученика (один файл контроллера)
// копируется внутрь, поднимается встроенный PHP-сервер, проверки — HTTP-запросы через curl
// изнутри самого контейнера (loopback работает даже с --network none, наружу сеть закрыта).
export async function runSymfonyApp(input: {
  code: string;
  targetPath: string;
  requests: HttpRequestSpec[];
  /** Консольные команды (например, doctrine:schema:create), выполняются после cp кода
   *  ученика и до старта сервера — нужны блокам, где упражнение требует подготовленную БД. */
  setupCommands?: string[];
  /** Дополнительные файлы, которые кладутся в проект вместе с основным кодом ученика —
   *  переопределяют обычно-статичные фикстуры только для этого запуска. */
  fixtureOverrides?: { path: string; content: string }[];
}): Promise<SymfonyAppRunResult> {
  const dir = await mkdtemp(join(tmpdir(), "symfony-course-app-"));
  const codeFile = join(dir, "code.php");
  await writeFile(codeFile, input.code, "utf8");

  const containerName = `sandbox-app-${randomUUID()}`;
  let timedOut = false;
  const overallTimer = setTimeout(() => {
    timedOut = true;
    spawn("docker", ["kill", containerName], { stdio: "ignore" });
  }, OVERALL_TIMEOUT_MS);

  const results: HttpRequestResult[] = [];
  let stderr = "";

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
        requests: [],
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

    let ready = false;
    if (!setupFailed) {
      await run(
        "docker",
        [
          "exec",
          "-d",
          containerName,
          "sh",
          "-c",
          "cd /skeleton && php -S 127.0.0.1:8000 -t public public/index.php > /tmp/server.log 2>&1",
        ],
        5000
      );

      const readyDeadline = Date.now() + SERVER_READY_TIMEOUT_MS;
      while (Date.now() < readyDeadline) {
        const probe = await run(
          "docker",
          [
            "exec",
            containerName,
            "curl",
            "-s",
            "-o",
            "/dev/null",
            "-w",
            "%{http_code}",
            "--max-time",
            "1",
            "http://127.0.0.1:8000/",
          ],
          2000
        );
        if (probe.stdout.trim().length > 0) {
          ready = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (!setupFailed && !ready) {
      const log = await run("docker", ["exec", containerName, "cat", "/tmp/server.log"], 2000);
      stderr += `Сервер приложения не поднялся вовремя.\n${log.stdout}\n`;
    } else if (ready) {
      // Общий cookie jar на всю последовательность запросов одного упражнения — сессия
      // (флеш-сообщения, в будущем — логин) переживает границу между отдельными curl-вызовами
      // точно так же, как переживал бы её один и тот же браузер.
      const cookieJar = "/tmp/sandbox-cookies.txt";
      for (const reqSpec of input.requests) {
        const curlArgs = [
          "exec",
          containerName,
          "curl",
          "-s",
          "-c",
          cookieJar,
          "-b",
          cookieJar,
          "--max-time",
          String(REQUEST_TIMEOUT_S),
          "-X",
          reqSpec.method,
          "-w",
          `\n${STATUS_MARKER}%{http_code}`,
        ];
        if (reqSpec.body !== undefined) {
          curlArgs.push("-H", `Content-Type: ${reqSpec.contentType ?? "application/json"}`, "-d", reqSpec.body);
        }
        curlArgs.push(`http://127.0.0.1:8000${reqSpec.path}`);

        const res = await run("docker", curlArgs, (REQUEST_TIMEOUT_S + 2) * 1000);
        const markerIndex = res.stdout.lastIndexOf(STATUS_MARKER);
        if (markerIndex === -1) {
          results.push({
            id: reqSpec.id,
            status: null,
            body: truncate(res.stdout || res.stderr, MAX_OUTPUT_BYTES),
          });
          continue;
        }
        const body = res.stdout.slice(0, markerIndex).replace(/\n$/, "");
        const statusStr = res.stdout.slice(markerIndex + STATUS_MARKER.length).trim();
        let status: number | null = null;
        if (statusStr !== "") {
          const parsed = Number(statusStr);
          if (Number.isFinite(parsed)) status = parsed;
        }
        results.push({ id: reqSpec.id, status, body: truncate(body, MAX_OUTPUT_BYTES) });
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

  return { requests: results, stderr: truncate(stderr, MAX_OUTPUT_BYTES), timedOut };
}
