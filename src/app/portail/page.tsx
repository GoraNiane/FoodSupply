import { redirect } from "next/navigation";
import { getVerifiedSessionUser } from "@/lib/auth/session";
import { getDefaultDashboardPath } from "@/lib/permissions/rbac";

export const dynamic = "force-dynamic";

export default async function PortalRedirectPage() {
  const user = await getVerifiedSessionUser();
  if (!user) {
    redirect("/connexion");
  }
  redirect(getDefaultDashboardPath(user.roles));
}
