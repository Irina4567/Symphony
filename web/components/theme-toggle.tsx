"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();

  if (!hydrated) return <div className="size-8" />;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex size-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground hover:bg-surface-muted"
      aria-label="Переключить тему"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
