import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Те же файлы, что зашиваются в Docker-образ песочницы (docker/symfony-app/fixtures) —
// показываем ученику ровно то, что реально исполняется, а не отдельную копию для UI.
const FIXTURES_ROOT = path.resolve(process.cwd(), "..", "docker", "symfony-app", "fixtures");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedPath = searchParams.get("path");
  if (!requestedPath) {
    return NextResponse.json({ error: "Не указан path" }, { status: 400 });
  }

  const resolved = path.resolve(FIXTURES_ROOT, requestedPath);
  if (resolved !== FIXTURES_ROOT && !resolved.startsWith(`${FIXTURES_ROOT}${path.sep}`)) {
    return NextResponse.json({ error: "Некорректный путь" }, { status: 400 });
  }

  try {
    const content = await readFile(resolved, "utf8");
    return NextResponse.json({ path: requestedPath, content });
  } catch {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }
}
