import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { Wifi, WifiOff } from "lucide-react";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [connected, setConnected] = useState<"checking" | "up" | "down">("checking");

  useEffect(() => {
    let mounted = true;
    api
      .health()
      .then(() => mounted && setConnected("up"))
      .catch(() => mounted && setConnected("down"));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      <Link
        to="/settings"
        className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
        title="API connection status — configure in Settings"
      >
        {connected === "up" && (
          <>
            <Wifi className="h-3.5 w-3.5 text-emerald-600" /> API connected
          </>
        )}
        {connected === "down" && (
          <>
            <WifiOff className="h-3.5 w-3.5 text-red-600" /> API unreachable
          </>
        )}
        {connected === "checking" && <>Checking API…</>}
      </Link>
    </header>
  );
}
