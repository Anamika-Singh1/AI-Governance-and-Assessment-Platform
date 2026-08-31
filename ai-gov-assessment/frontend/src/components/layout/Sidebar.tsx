import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FilePlus2, ListChecks, Library, History, BookOpen, Settings, ShieldCheck, Gavel } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/new-assessment", label: "New Assessment", icon: FilePlus2 },
  { to: "/findings", label: "Findings", icon: ListChecks },
  { to: "/sources", label: "Sources / Research", icon: Library },
  { to: "/history", label: "Assessment History", icon: History },
  { to: "/methodology", label: "Rules & Methodology", icon: BookOpen },
  { to: "/governance-rules", label: "Governance Rules", icon: Gavel },
  { to: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight text-slate-900">AI Governance</div>
          <div className="text-[11px] leading-tight text-slate-500">Assessment Platform</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-4 text-[11px] leading-relaxed text-slate-400">
        Deterministic scoring engine v1.0.0
        <br />
        Not legal advice.
      </div>
    </aside>
  );
}
