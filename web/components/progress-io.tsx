"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload, Check, AlertTriangle } from "lucide-react";
import { useProgress } from "@/lib/progress";

type Status = "idle" | "success" | "error";

export function ProgressIO() {
  const { getExportPayload, importProgress } = useProgress();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportStatus, setExportStatus] = useState<Status>("idle");
  const [importStatus, setImportStatus] = useState<Status>("idle");
  const [importError, setImportError] = useState<string | null>(null);

  function flash(setter: (status: Status) => void) {
    setter("success");
    setTimeout(() => setter("idle"), 1800);
  }

  function handleExport() {
    const payload = getExportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `symfony-course-progress-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    flash(setExportStatus);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const data: unknown = JSON.parse(text);
      const ok = importProgress(data);
      if (!ok) throw new Error("Файл не похож на экспорт прогресса этого курса");
      flash(setImportStatus);
      setImportError(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Не удалось прочитать файл");
      setImportStatus("error");
      setTimeout(() => setImportStatus("idle"), 2500);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleExport}
        title="Скачать прогресс в JSON"
        aria-label="Скачать прогресс"
        className="flex size-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground hover:bg-surface-muted"
      >
        {exportStatus === "success" ? <Check size={16} className="text-success" /> : <Download size={16} />}
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={handleImportClick}
          title="Загрузить прогресс из JSON"
          aria-label="Загрузить прогресс"
          className="flex size-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground hover:bg-surface-muted"
        >
          {importStatus === "success" ? (
            <Check size={16} className="text-success" />
          ) : importStatus === "error" ? (
            <AlertTriangle size={16} className="text-danger" />
          ) : (
            <Upload size={16} />
          )}
        </button>
        {importStatus === "error" && importError && (
          <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-lg border border-danger/40 bg-surface p-2 text-xs text-danger shadow-lg">
            {importError}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
