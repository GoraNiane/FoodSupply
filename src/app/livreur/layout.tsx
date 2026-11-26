import { ClipboardList, History, LayoutDashboard, Truck, User, Wallet } from "lucide-react";
import { requirePageRole } from "@/lib/auth/session";
import { PortalShellClient } from "@/components/layout/portal-shell-client";
import type { NavSection } from "@/components/layout/dashboard-shell";

export const dynamic = "force-dynamic";

const DRIVER_SECTIONS: NavSection[] = [
  {
    title: "Tournées Dakar",
    items: [
      { href: "/livreur", label: "Tableau de bord", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/livreur/missions", label: "Missions disponibles", icon: <ClipboardList className="h-4 w-4" /> },
      { href: "/livreur/livraisons", label: "Mes livraisons", icon: <Truck className="h-4 w-4" /> },
      { href: "/livreur/historique", label: "Historique", icon: <History className="h-4 w-4" /> },
      { href: "/livreur/remunerations", label: "Mes rémunérations", icon: <Wallet className="h-4 w-4" /> },
      { href: "/livreur/profil", label: "Mon profil", icon: <User className="h-4 w-4" /> },
    ],
  },
];

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["DRIVER"], "/connexion-admin");

  return (
    <PortalShellClient
      portalName="Espace Livreur"
      userDisplayName={user.fullName}
      userRoleLabel="Livreur Partenaire"
      notificationsHref="/livreur"
      sections={DRIVER_SECTIONS}
    >
      {children}
    </PortalShellClient>
  );
}
