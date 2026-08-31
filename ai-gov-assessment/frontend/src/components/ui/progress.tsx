import { cn } from "@/lib/utils";

export function Progress({ value, className, colorClass }: { value: number; className?: string; colorClass?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className={cn("h-full rounded-full transition-all", colorClass || "bg-brand-500")}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
