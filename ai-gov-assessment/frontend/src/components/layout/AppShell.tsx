import { ReactNode, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const [connection, setConnection] = useState<"checking" | "up" | "down">("checking");
  useEffect(() => {
    let active = true;
    api.health().then(() => { if (active) setConnection("up"); }).catch(() => { if (active) setConnection("down"); });
    return () => { active = false; };
  }, []);
  const drawer = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  function closeMenu() { drawer.current?.close(); }
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => { if (desktop.matches) drawer.current?.close(); };
    desktop.addEventListener("change", onResize);
    return () => desktop.removeEventListener("change", onResize);
  }, []);
  return (
    <div className="flex h-dvh w-full overflow-hidden workspace-shell bg-slate-50 dark:bg-slate-950">
      <Sidebar connection={connection} />
      <dialog ref={drawer} id="mobile-navigation" aria-label="Main navigation"
        onClose={() => menuButton.current?.focus()}
        onClick={(event) => { if (event.target === event.currentTarget) closeMenu(); }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-slate-950/50 lg:hidden">
        <div className="relative h-full w-80 max-w-[85vw]">
          <button type="button" autoFocus onClick={closeMenu} aria-label="Close navigation" className="absolute right-2 top-4 z-10 grid h-11 w-11 place-items-center rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 focus-visible:outline-brand-500"><X className="h-5 w-5" /></button>
          <Sidebar mobile connection={connection} onNavigate={closeMenu} />
        </div>
      </dialog>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} subtitle={subtitle} menuButtonRef={menuButton} onOpenMenu={() => drawer.current?.showModal()} />
        <main id="main-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [overflow-wrap:anywhere] sm:px-8 sm:py-8"><div className="mx-auto w-full max-w-[1200px]">{children}</div></main>
      </div>
    </div>
  );
}
