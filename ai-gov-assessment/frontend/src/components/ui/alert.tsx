import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";

const styles = {
  info: { wrap: "bg-sky-50 border-sky-200 text-sky-800", icon: Info },
  warning: { wrap: "bg-amber-50 border-amber-200 text-amber-800", icon: AlertTriangle },
  success: { wrap: "bg-emerald-50 border-emerald-200 text-emerald-800", icon: CheckCircle2 },
  error: { wrap: "bg-red-50 border-red-200 text-red-800", icon: XCircle }
} as const;

export function Alert({
  variant = "info",
  title,
  children,
  className
}: {
  variant?: keyof typeof styles;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const s = styles[variant];
  const Icon = s.icon;
  return (
    <div className={cn("flex gap-3 rounded-lg border p-3 text-sm", s.wrap, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title && <div className="font-medium">{title}</div>}
        {children && <div className="mt-0.5 text-[13px] leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}
