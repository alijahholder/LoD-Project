import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import IdleTimeout from "@/components/IdleTimeout";
import {
  LayoutDashboard,
  FileText,
  Stethoscope,
  Inbox,
  Scale,
  Wallet,
  Settings,
  ShieldCheck,
} from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    include: { claims: { take: 1, orderBy: { createdAt: "desc" } } },
  });

  const idleMinutes = Number(process.env.SESSION_IDLE_MINUTES ?? "30");

  return (
    <div className="min-h-screen bg-brand-50/50">
      <IdleTimeout idleMinutes={idleMinutes} />
      <header className="sticky top-0 z-10 border-b border-brand-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-brand-900">
            <span className="inline-block h-6 w-6 rounded-md bg-brand-700" aria-hidden />
            Gridiron LOD
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-brand-700">{session.user.email}</span>
            {role === "admin" ? (
              <Link href="/admin" className="text-brand-700 underline">
                Admin
              </Link>
            ) : null}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-[240px_1fr] gap-6 px-6 py-6">
        <aside aria-label="Primary" className="space-y-1 text-sm">
          <NavLink href="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
          <NavLink href="/claim" icon={FileText}>My claim</NavLink>
          <NavLink href="/records" icon={Inbox}>Medical records</NavLink>
          <NavLink href="/exams" icon={Stethoscope}>Neutral physician</NavLink>
          <NavLink href="/appeals" icon={Scale}>Appeals</NavLink>
          <NavLink href="/payments" icon={Wallet}>Offsets &amp; payments</NavLink>
          <div className="my-3 border-t border-brand-100" />
          <NavLink href="/settings" icon={Settings}>Settings &amp; MFA</NavLink>
          {role === "admin" ? (
            <NavLink href="/admin" icon={ShieldCheck}>Admin</NavLink>
          ) : null}

          {profile?.claims[0] ? (
            <div className="mt-6 rounded-lg border border-brand-100 bg-white p-3 text-xs text-brand-700">
              <div className="font-medium text-brand-900">Active claim</div>
              <div>Status: {profile.claims[0].status}</div>
            </div>
          ) : null}
        </aside>
        <section>{children}</section>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-brand-800 hover:bg-brand-100"
    >
      <Icon className="h-4 w-4" />
      <span>{children}</span>
    </Link>
  );
}
