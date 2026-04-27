import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 shadow-sm placeholder:text-brand-300",
        "focus:border-brand-500 focus:ring-2 focus:ring-brand-200",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 shadow-sm placeholder:text-brand-300",
        "focus:border-brand-500 focus:ring-2 focus:ring-brand-200",
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 shadow-sm",
        "focus:border-brand-500 focus:ring-2 focus:ring-brand-200",
        className,
      )}
      {...props}
    />
  );
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1 block text-sm font-medium text-brand-800", className)}
      {...props}
    />
  );
}
