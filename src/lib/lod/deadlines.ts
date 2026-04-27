import { addDays, addMonths, addYears, differenceInCalendarDays, max } from "date-fns";

/**
 * LOD filing deadline:
 *   the GREATER of (a) 48 months OR (b) the number of years equal to the
 *   player's Credited Seasons, measured from the date the player ceased to
 *   be an Active Player.
 */
export function computeLodFilingDeadline(args: {
  lastActivePlayerDate: Date;
  creditedSeasons: number;
}): Date {
  const a = addMonths(args.lastActivePlayerDate, 48);
  const b = addYears(args.lastActivePlayerDate, Math.max(0, args.creditedSeasons));
  return max([a, b]);
}

export function daysUntil(target: Date | null | undefined, now = new Date()): number | null {
  if (!target) return null;
  return differenceInCalendarDays(target, now);
}

/** 45-day completeness clock starts when the application is filed. */
export function computeCompletenessClockEnd(filedAt: Date): Date {
  return addDays(filedAt, 45);
}

/** ERISA appeal clock = 180 days from the date on the denial letter. */
export function computeAppealDeadline(deniedAt: Date): Date {
  return addDays(deniedAt, 180);
}

export type DeadlineUrgency = "ok" | "soon" | "urgent" | "overdue";

export function classifyUrgency(days: number | null): DeadlineUrgency {
  if (days === null) return "ok";
  if (days < 0) return "overdue";
  if (days <= 14) return "urgent";
  if (days <= 90) return "soon";
  return "ok";
}
