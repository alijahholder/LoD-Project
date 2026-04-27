import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export default async function AdminGuard({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") redirect("/dashboard");

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnrolledAt: true },
  });
  if (!user?.mfaEnrolledAt) {
    redirect("/settings?reason=admin-mfa-required");
  }

  return <>{children}</>;
}
