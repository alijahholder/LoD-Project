import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...args: ClassValue[]) {
  return twMerge(clsx(args));
}

export function formatDate(d: Date | string | null | undefined, fallback = "—") {
  if (!d) return fallback;
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function formatPercent(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function pluralize(n: number, singular: string, plural?: string) {
  return n === 1 ? singular : (plural ?? `${singular}s`);
}
