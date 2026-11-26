import * as React from "react";
import { cn } from "@/lib/utils/cn";

const baseInputClass =
  "w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-slate-500";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        baseInputClass,
        hasError && "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20",
        className
      )}
      aria-invalid={hasError || undefined}
      {...props}
    />
  )
);
Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        baseInputClass,
        hasError && "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20",
        className
      )}
      aria-invalid={hasError || undefined}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        baseInputClass,
        "min-h-[100px] resize-y",
        hasError && "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20",
        className
      )}
      aria-invalid={hasError || undefined}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-navy-900">
        {label}
        {required && (
          <span className="ml-1 text-danger-600" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
