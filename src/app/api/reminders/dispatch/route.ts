import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { getEmail, getSMS } from "@/lib/notifications";
import { audit } from "@/lib/audit";

/**
 * Reminder dispatcher. Hit this from Vercel Cron / external scheduler hourly.
 * Looks for upcoming follow-ups, claim deadlines, and 45-day completeness
 * clocks, queues outbound email + SMS, and records send to the audit log.
 */
export async function POST() {
  const now = new Date();
  const horizon = addDays(now, 1);

  // Imminent follow-ups (next 24h)
  const followUps = await prisma.followUp.findMany({
    where: { completedAt: null, dueAt: { lte: horizon } },
    include: {
      request: { include: { claim: { include: { profile: { include: { user: true } } } } } },
    },
  });

  for (const f of followUps) {
    const user = f.request.claim.profile.user;
    if (!user.email) continue;
    await getEmail().send({
      to: user.email,
      subject: `[Gridiron LOD] Follow up with ${f.request.providerName}`,
      body:
        `Hi ${user.name ?? "there"},\n\n` +
        `It's time to ${f.channel} ${f.request.providerName} about your medical-records request.\n\n` +
        `Open the request in Gridiron LOD to log the call once you've made it — every contact becomes part of your ERISA administrative record.\n\n` +
        `Due: ${f.dueAt.toLocaleString()}\n`,
    });
    await audit({
      userId: user.id,
      action: "reminder.email_sent",
      entityType: "followup",
      entityId: f.id,
    });
  }

  // Filing deadlines: 30 / 14 / 7 / 1 days out
  const claims = await prisma.claim.findMany({
    where: { filingDeadline: { not: null }, status: { in: ["draft", "screening", "building"] } },
    include: { profile: { include: { user: true } } },
  });
  for (const c of claims) {
    if (!c.filingDeadline) continue;
    const days = Math.ceil((c.filingDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (![30, 14, 7, 1].includes(days)) continue;
    const u = c.profile.user;
    if (!u.email) continue;
    await getEmail().send({
      to: u.email,
      subject: `[Gridiron LOD] ${days} days to your LOD filing deadline`,
      body:
        `Your filing deadline is ${c.filingDeadline.toLocaleDateString()}.\n\n` +
        `Open the claim builder in Gridiron LOD and submit before the date above. Late filings are not generally accepted.\n`,
    });
    if (days <= 7) {
      // Console SMS in dev; Twilio in prod
      await getSMS().send({
        to: u.email,
        body: `Gridiron LOD: ${days}d to file your LOD claim. Open the app to finish your packet.`,
      });
    }
    await audit({ userId: u.id, action: "reminder.deadline_email_sent", entityType: "claim", entityId: c.id });
  }

  return NextResponse.json({ ok: true, processed: followUps.length, claims: claims.length });
}
