import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = `Switch to ${theme === "light" ? "dark" : "light"} mode`;
  const Icon = theme === "light" ? Moon : Sun;
  return (
    <button type="button" onClick={toggleTheme} aria-label={label} title={label}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
