"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const MINUTE = 60_000;
const DEFAULT_IDLE_MIN = 15;

/**
 * Forces sign-out after N minutes of no user activity. HIPAA technical
 * safeguards require an automatic logoff (45 CFR 164.312(a)(2)(iii)). The
 * timer also resets on visibility changes so a tab left open isn't extended
 * by background timers alone.
 */
export default function IdleTimeout({ idleMinutes = DEFAULT_IDLE_MIN }: { idleMinutes?: number }) {
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const limit = idleMinutes * MINUTE;

    function reset() {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        signOut({ callbackUrl: "/sign-in?reason=idle" }).catch(() => {
          window.location.href = "/sign-in?reason=idle";
        });
      }, limit);
    }

    const activity = ["mousemove", "keydown", "click", "scroll", "touchstart", "visibilitychange"];
    activity.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));
    reset();

    return () => {
      activity.forEach((evt) => window.removeEventListener(evt, reset));
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [idleMinutes]);

  return null;
}
