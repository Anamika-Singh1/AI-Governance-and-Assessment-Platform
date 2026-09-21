import { RefObject } from "react";
import { Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({ title, subtitle, onOpenMenu, menuButtonRef }: { title: string; subtitle?: string; onOpenMenu: () => void; menuButtonRef: RefObject<HTMLButtonElement | null> }) {
  const {user}=useAuth();
  return (
    <header className="z-10 shrink-0 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button ref={menuButtonRef} type="button" onClick={onOpenMenu} aria-label="Open navigation" aria-haspopup="dialog" aria-controls="mobile-navigation" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 focus-visible:outline-brand-500 dark:border-slate-700 dark:text-slate-300 lg:hidden"><Menu className="h-5 w-5" /></button>
        <h1 className="min-w-0 flex-1 text-base font-semibold tracking-tight text-slate-900 [overflow-wrap:anywhere] dark:text-slate-100 sm:text-lg">{title}</h1>
        <div className="flex shrink-0 items-center justify-end gap-3">
          <span className="hidden max-w-40 truncate text-xs text-slate-500 dark:text-slate-400 sm:block">{user?.name}</span>
          <ThemeToggle />

        </div>
      </div>
      {subtitle && <p className="mt-2 text-xs text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400 sm:text-sm">{subtitle}</p>}
    </header>
  );
}
