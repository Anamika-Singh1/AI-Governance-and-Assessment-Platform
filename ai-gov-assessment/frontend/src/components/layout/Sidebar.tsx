import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { NavLink, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FilePlus2, ListChecks, Library, History, BookOpen, Settings, ShieldCheck, Gavel, Wifi, WifiOff, Loader2, LogOut } from "lucide-react";

const links = [
  { to: "/new-assessment", label: "New assessment", icon: FilePlus2 },
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/findings", label: "Findings", icon: ListChecks },
  { to: "/sources", label: "Sources / Research", icon: Library },
  { to: "/history", label: "Assessment History", icon: History },
  { to: "/methodology", label: "Rules & Methodology", icon: BookOpen },
  { to: "/governance-rules", label: "Governance Rules", icon: Gavel },
  { to: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar({ mobile = false, onNavigate, connection }: { mobile?: boolean; onNavigate?: () => void; connection: "checking" | "up" | "down" }) {
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const statusLabel = connection === "up" ? "API connected" : connection === "down" ? "API unreachable" : "Checking API";
  async function signOut() {
    setSigningOut(true);
    setError("");
    try { await logout(); }
    catch { setError("Unable to sign out. Please retry."); setSigningOut(false); }
  }
  return (
    <aside className={cn("navigation-rail h-full min-h-0 shrink-0 flex-col", mobile ? "flex w-full pt-14" : "hidden w-64 lg:flex")}>
      <div className="shrink-0 border-b border-neutral-200 px-3 py-4 dark:border-neutral-700">
        <div className="flex items-center gap-1">
          <Link to="/settings" onClick={onNavigate} aria-label={statusLabel} title={statusLabel} className="grid h-11 w-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-neutral-200/70 dark:hover:bg-neutral-800">
            {connection === "up" ? <Wifi aria-hidden="true" className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : connection === "down" ? <WifiOff aria-hidden="true" className="h-5 w-5 text-red-600 dark:text-red-400" /> : <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />}
            <span className="sr-only" role="status">{statusLabel}</span>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-tight text-neutral-900 dark:text-neutral-100">AI Governance</div>
            <div className="text-[11px] leading-tight text-neutral-500 dark:text-neutral-400">Assessment Platform</div>
          </div>

        </div>

      </div>
      <nav aria-label="Primary" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <div className="px-3 pb-3 text-[10px] font-medium text-neutral-500 dark:text-neutral-400">Workspace</div>
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-500",
                isActive ? "bg-neutral-200/70 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="shrink-0 border-t border-neutral-200 px-3 py-4 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-200"><ShieldCheck className="h-4 w-4 shrink-0" /> Responsible AI, by design</div>
            Assessment guidance. Not legal advice.
          </div>
          <button type="button" onClick={signOut} disabled={signingOut} aria-label={signingOut ? "Signing out" : "Sign out"} title="Sign out" className="grid h-11 w-10 shrink-0 place-items-center rounded-lg border border-neutral-200 text-neutral-700 transition-colors hover:bg-neutral-200/70 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
            {signingOut ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <LogOut aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p>}
      </div>
    </aside>
  );
}
