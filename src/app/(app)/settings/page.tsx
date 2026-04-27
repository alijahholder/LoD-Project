import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import MfaEnrollClient from "./MfaEnrollClient";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, role: true, mfaEnrolledAt: true, totpSecret: true, lastLoginAt: true },
  });
  if (!user) redirect("/sign-in");

  const sp = await searchParams;
  const reason = typeof sp.reason === "string" ? sp.reason : undefined;

  return (
    <PageShell>
      <PageHeader
        title="Settings & security"
        subtitle="Manage your sign-in and multi-factor authentication."
      />
      {reason === "admin-mfa-required" ? (
        <Callout tone="warn" title="MFA required for admin access">
          Admin users must enroll in two-factor authentication before reaching the admin console. Enroll below to continue.
        </Callout>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-brand-800">
            <div><strong>Name:</strong> {user.name ?? "—"}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Role:</strong> {user.role}</div>
            <div>
              <strong>Last sign-in:</strong>{" "}
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Multi-factor authentication (TOTP)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-brand-700">Status:</span>
              {user.mfaEnrolledAt ? (
                <Badge tone="ok">Enrolled</Badge>
              ) : (
                <Badge tone="warn">Not enrolled</Badge>
              )}
            </div>
            <p className="text-sm text-brand-700">
              Use an authenticator app (Google Authenticator, 1Password, Authy, Microsoft Authenticator, etc.) to add a second factor.
            </p>
            <MfaEnrollClient enrolled={!!user.mfaEnrolledAt} email={user.email} />
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
