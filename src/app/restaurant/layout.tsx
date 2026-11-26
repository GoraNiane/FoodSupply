import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { requirePageRole } from "@/lib/auth/session";
import { PortalShellClient } from "@/components/layout/portal-shell-client";
import type { NavSection } from "@/components/layout/dashboard-shell";

export const dynamic = "force-dynamic";

const RESTAURANT_SECTIONS: NavSection[] = [
  {
    title: "Mon approvisionnement",
    items: [
      { href: "/restaurant", label: "Tableau de bord", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/catalogue", label: "Catalogue produits", icon: <ShoppingBag className="h-4 w-4" /> },
      { href: "/restaurant/panier", label: "Mon panier", icon: <ShoppingCart className="h-4 w-4" /> },
      { href: "/restaurant/commandes", label: "Mes commandes", icon: <ClipboardList className="h-4 w-4" /> },
      { href: "/restaurant/factures", label: "Mes factures PDF", icon: <FileText className="h-4 w-4" /> },
    ],
  },
];

export default async function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["RESTAURANT"], "/connexion");

  return (
    <PortalShellClient
      portalName="Espace Client"
      userDisplayName={user.fullName}
      userRoleLabel="Client Professionnel"
      notificationsHref="/restaurant/commandes"
      signOutCallbackUrl="/connexion"
      sections={RESTAURANT_SECTIONS}
    >
      {children}
    </PortalShellClient>
  );
}
