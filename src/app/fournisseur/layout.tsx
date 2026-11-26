import { Building2, LayoutDashboard, PackagePlus } from "lucide-react";
import { requirePageRole } from "@/lib/auth/session";
import { PortalShellClient } from "@/components/layout/portal-shell-client";
import type { NavSection } from "@/components/layout/dashboard-shell";

export const dynamic = "force-dynamic";

const SUPPLIER_SECTIONS: NavSection[] = [
  {
    title: "Mon Espace Fournisseur",
    items: [
      { href: "/fournisseur", label: "Tableau de bord", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/fournisseur/produits", label: "Mes propositions produits", icon: <PackagePlus className="h-4 w-4" /> },
      { href: "/fournisseur/profil", label: "Profil entreprise", icon: <Building2 className="h-4 w-4" /> },
    ],
  },
];

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["SUPPLIER"], "/connexion-fournisseur");

  return (
    <PortalShellClient
      portalName="Espace Fournisseur"
      userDisplayName={user.fullName}
      userRoleLabel="Fournisseur Partenaire"
      notificationsHref="/fournisseur"
      signOutCallbackUrl="/connexion-fournisseur"
      sections={SUPPLIER_SECTIONS}
    >
      {children}
    </PortalShellClient>
  );
}
