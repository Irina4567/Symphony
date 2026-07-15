"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, FileCode2, FolderOpen, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContextFile } from "@/content/types";

interface FolderNode {
  type: "folder";
  name: string;
  children: TreeNode[];
}

interface FileNode {
  type: "file";
  name: string;
  path: string;
  description?: string;
}

type TreeNode = FolderNode | FileNode;

function buildTree(files: ContextFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  function insert(children: TreeNode[], parts: string[], file: ContextFile) {
    const [head, ...rest] = parts;
    if (rest.length === 0) {
      children.push({ type: "file", name: head, path: file.path, description: file.description });
      return;
    }
    let folder = children.find((node): node is FolderNode => node.type === "folder" && node.name === head);
    if (!folder) {
      folder = { type: "folder", name: head, children: [] };
      children.push(folder);
    }
    insert(folder.children, rest, file);
  }

  for (const file of files) {
    insert(root, file.path.split("/"), file);
  }

  function sort(nodes: TreeNode[]): TreeNode[] {
    return [...nodes]
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((node) => (node.type === "folder" ? { ...node, children: sort(node.children) } : node));
  }

  return sort(root);
}

export function ContextFiles({ files, exerciseId }: { files: ContextFile[]; exerciseId?: string }) {
  const tree = buildTree(files);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function toggleFile(filePath: string) {
    if (openPath === filePath) {
      setOpenPath(null);
      return;
    }
    setOpenPath(filePath);
    if (contents[filePath] !== undefined) return;

    setLoadingPath(filePath);
    try {
      const query = new URLSearchParams({ path: filePath });
      if (exerciseId) query.set("exerciseId", exerciseId);
      const res = await fetch(`/api/context-file?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить файл");
      setContents((prev) => ({ ...prev, [filePath]: data.content }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [filePath]: err instanceof Error ? err.message : "Не удалось загрузить файл",
      }));
    } finally {
      setLoadingPath(null);
    }
  }

  function renderNode(node: TreeNode, depth: number): ReactNode {
    const indent = depth * 16 + 8;

    if (node.type === "folder") {
      return (
        <div key={`folder-${depth}-${node.name}`}>
          <div
            className="flex items-center gap-1.5 py-1 text-xs font-medium text-muted"
            style={{ paddingLeft: indent }}
          >
            <FolderOpen size={13} className="shrink-0" />
            {node.name}
          </div>
          {node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }

    const isOpen = openPath === node.path;
    return (
      <div key={node.path}>
        <button
          type="button"
          onClick={() => toggleFile(node.path)}
          className="flex w-full items-center gap-1.5 py-1.5 pr-3 text-left text-sm hover:bg-surface-muted"
          style={{ paddingLeft: indent }}
        >
          <ChevronRight
            size={12}
            className={cn("shrink-0 text-muted transition-transform", isOpen && "rotate-90")}
          />
          <FileCode2 size={13} className="shrink-0 text-muted" />
          <span className="flex-1 truncate">{node.name}</span>
          {node.description && (
            <span className="hidden shrink-0 text-xs text-muted sm:inline">{node.description}</span>
          )}
          {loadingPath === node.path && <Loader2 size={13} className="shrink-0 animate-spin text-muted" />}
        </button>
        {isOpen && (
          <div style={{ paddingLeft: indent }} className="pb-2 pr-3">
            {errors[node.path] && (
              <p className="flex items-center gap-1.5 text-sm text-danger">
                <AlertTriangle size={14} /> {errors[node.path]}
              </p>
            )}
            {contents[node.path] !== undefined && (
              <pre className="thin-scrollbar max-h-96 overflow-auto rounded-lg bg-surface-muted p-3 font-mono text-xs">
                {contents[node.path]}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-semibold">Файлы проекта</h3>
        <p className="mt-1 text-sm text-muted">
          Эти файлы уже есть в песочнице (ты их не редактируешь) — загляни в них, прежде чем
          писать код ниже.
        </p>
      </div>
      <div className="py-1">{tree.map((node) => renderNode(node, 0))}</div>
    </div>
  );
}
