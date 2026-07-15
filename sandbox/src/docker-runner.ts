import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const MAX_OUTPUT_BYTES = 64 * 1024;
const DOCKER_IMAGE = "php-plain-sandbox";
const RUN_TIMEOUT_MS = 5000;

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

function truncate(chunks: Buffer[], limit: number): string {
  const buf = Buffer.concat(chunks);
  if (buf.length <= limit) return buf.toString("utf8");
  return `${buf.subarray(0, limit).toString("utf8")}\n… (вывод обрезан)`;
}

// Каждый запуск — свежий disposable-контейнер без сети, без записи на диск
// (кроме tmpfs) и с урезанными лимитами по памяти/CPU/процессам.
export async function runPhp(code: string): Promise<RunResult> {
  const dir = await mkdtemp(join(tmpdir(), "symfony-course-"));
  const codeFile = join(dir, "index.php");
  await writeFile(codeFile, code, "utf8");

  const containerName = `sandbox-${randomUUID()}`;

  const args = [
    "run",
    "--name",
    containerName,
    "--rm",
    "--network",
    "none",
    "--memory",
    "128m",
    "--memory-swap",
    "128m",
    "--cpus",
    "0.5",
    "--pids-limit",
    "64",
    "--read-only",
    "--tmpfs",
    "/tmp:rw,size=8m,mode=1777",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "-v",
    `${codeFile}:/app/index.php:ro`,
    "-w",
    "/app",
    DOCKER_IMAGE,
    "php",
    "index.php",
  ];

  return new Promise<RunResult>((resolve) => {
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let timedOut = false;

    // Внешний таймаут на стороне хоста надёжнее, чем полагаться на утилиты
    // внутри контейнера — docker kill гарантированно останавливает контейнер
    // независимо от того, что происходит внутри процесса php.
    const timer = setTimeout(() => {
      timedOut = true;
      spawn("docker", ["kill", containerName], { stdio: "ignore" });
    }, RUN_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    child.on("close", async (exitCode) => {
      clearTimeout(timer);
      await rm(dir, { recursive: true, force: true });
      resolve({
        stdout: truncate(stdoutChunks, MAX_OUTPUT_BYTES),
        stderr: timedOut
          ? `${truncate(stderrChunks, MAX_OUTPUT_BYTES)}\nПревышено время выполнения (${RUN_TIMEOUT_MS}мс).`
          : truncate(stderrChunks, MAX_OUTPUT_BYTES),
        exitCode,
        timedOut,
      });
    });

    child.on("error", async (err) => {
      clearTimeout(timer);
      await rm(dir, { recursive: true, force: true });
      resolve({
        stdout: "",
        stderr: `Не удалось запустить песочницу: ${err.message}`,
        exitCode: null,
        timedOut: false,
      });
    });
  });
}
