import { cn } from "@/lib/utils";

type Tone = "default" | "ok" | "warn" | "danger" | "info" | "muted";
const tones: Record<Tone, string> = {
  default: "bg-brand-100 text-brand-800",
  ok: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-800",
  muted: "bg-slate-100 text-slate-700",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
