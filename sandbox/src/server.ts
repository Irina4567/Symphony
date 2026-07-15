import express from "express";
import cors from "cors";
import { z } from "zod";
import { runPhp } from "./docker-runner.js";
import { runSymfonyApp } from "./symfony-app-runner.js";
import { Semaphore } from "./semaphore.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MAX_CODE_LENGTH = 20_000;
const MAX_CONCURRENT_RUNS = 3;

const runSemaphore = new Semaphore(MAX_CONCURRENT_RUNS);

const httpRequestSchema = z.object({
  id: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().min(1),
  body: z.string().optional(),
});

const runRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("plain-php"),
    code: z.string().min(1).max(MAX_CODE_LENGTH),
  }),
  z.object({
    mode: z.literal("symfony-app"),
    code: z.string().min(1).max(MAX_CODE_LENGTH),
    targetPath: z.string().min(1).max(200),
    requests: z.array(httpRequestSchema).min(1).max(10),
  }),
]);

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/run", async (req, res) => {
  const parsed = runRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректный запрос", details: parsed.error.flatten() });
    return;
  }

  const release = await runSemaphore.acquire();
  try {
    if (parsed.data.mode === "plain-php") {
      const result = await runPhp(parsed.data.code);
      res.json(result);
    } else {
      const result = await runSymfonyApp({
        code: parsed.data.code,
        targetPath: parsed.data.targetPath,
        requests: parsed.data.requests,
      });
      res.json(result);
    }
  } catch {
    res.status(500).json({ error: "Внутренняя ошибка песочницы" });
  } finally {
    release();
  }
});

app.listen(PORT, () => {
  console.log(`Sandbox service listening on http://localhost:${PORT}`);
});
