import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActiveClaim } from "@/lib/claim";

export default async function ClaimIndex() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const claim = await getActiveClaim(userId);
  if (!claim) redirect("/claim/new");
  redirect(`/claim/${claim.id}`);
}
