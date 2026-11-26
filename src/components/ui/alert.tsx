import * as React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type AlertVariant = "info" | "success" | "warning" | "danger";

const STYLES: Record<AlertVariant, { wrapper: string; icon: React.ReactNode }> = {
  info: {
    wrapper: "border-navy-200 bg-navy-50 text-navy-900",
    icon: <Info className="h-5 w-5 shrink-0 text-navy-600" />,
  },
  success: {
    wrapper: "border-success-500/30 bg-success-50 text-success-700",
    icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" />,
  },
  warning: {
    wrapper: "border-warning-500/30 bg-warning-50 text-warning-700",
    icon: <AlertTriangle className="h-5 w-5 shrink-0 text-warning-600" />,
  },
  danger: {
    wrapper: "border-danger-500/30 bg-danger-50 text-danger-700",
    icon: <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" />,
  },
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
}

export function Alert({ variant = "info", title, className, children, ...props }: AlertProps) {
  const style = STYLES[variant];
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border p-4 text-sm", style.wrapper, className)}
      {...props}
    >
      {style.icon}
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
