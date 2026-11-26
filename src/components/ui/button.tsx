import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700",
        navy: "bg-ink-900 text-white shadow-sm hover:bg-navy-900 active:bg-ink-950",
        secondary: "bg-navy-50 text-navy-900 hover:bg-navy-100",
        outline:
          "border border-surface-border bg-white text-navy-900 hover:border-navy-200 hover:bg-surface-muted",
        ghost: "text-navy-700 hover:bg-surface-subtle hover:text-navy-900",
        danger: "bg-danger-600 text-white shadow-sm hover:bg-danger-700",
        success: "bg-success-600 text-white shadow-sm hover:bg-success-700",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, loadingText, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isLoading && loadingText ? loadingText : children}
      </button>
    );
  }
);
Button.displayName = "Button";
