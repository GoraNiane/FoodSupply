import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface BrandLogoProps {
  href?: string;
  variant?: "light" | "dark";
  subtitle?: string;
  className?: string;
}

export function BrandLogo({
  href = "/",
  variant = "light",
  subtitle,
  className,
}: BrandLogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col">
        <span
          className={cn(
            "text-lg font-extrabold tracking-tight leading-none",
            variant === "dark" ? "text-white" : "text-navy-900"
          )}
        >
          Food<span className="text-brand-500">Supply</span>
        </span>
        {subtitle && (
          <span
            className={cn(
              "mt-0.5 text-[11px] font-medium leading-none",
              variant === "dark" ? "text-navy-200" : "text-slate-500"
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );

  return (
    <Link href={href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg">
      {content}
    </Link>
  );
}
