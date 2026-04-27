import { AlertTriangle, Info, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "warn" | "danger" | "success";

const styles: Record<Tone, string> = {
  info: "bg-sky-50 border-sky-200 text-sky-900",
  warn: "bg-amber-50 border-amber-200 text-amber-900",
  danger: "bg-red-50 border-red-200 text-red-900",
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
};

const Icons: Record<Tone, React.ComponentType<{ className?: string }>> = {
  info: Info,
  warn: AlertTriangle,
  danger: ShieldAlert,
  success: CheckCircle2,
};

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = Icons[tone];
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm",
        styles[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="space-y-1">
        {title ? <div className="font-semibold">{title}</div> : null}
        <div className="prose-plain">{children}</div>
      </div>
    </div>
  );
}
