import {
  BarChart3,
  Briefcase,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  FolderTree,
  Inbox,
  LayoutDashboard,
  Mail,
  Package,
  Percent,
  Settings,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";
import { requirePageRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { PortalShellClient } from "@/components/layout/portal-shell-client";
import type { NavSection } from "@/components/layout/dashboard-shell";

export const dynamic = "force-dynamic";

const ADMIN_SECTIONS: NavSection[] = [
  {
    title: "Pilotage FoodSupply",
    items: [
      { href: "/admin", label: "Tableau de bord", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/admin/commandes", label: "Commandes clients", icon: <ClipboardList className="h-4 w-4" /> },
      { href: "/admin/livraisons", label: "Suivi livraisons", icon: <Truck className="h-4 w-4" /> },
    ],
  },
  {
    title: "Fournisseurs (Coulisses)",
    items: [
      { href: "/admin/propositions", label: "Propositions produits", icon: <Inbox className="h-4 w-4" /> },
      { href: "/admin/fournisseurs", label: "Fournisseurs inscrits", icon: <Building2 className="h-4 w-4" /> },
    ],
  },
  {
    title: "Catalogue Public & Tarifs",
    items: [
      { href: "/admin/categories", label: "Catégories", icon: <FolderTree className="h-4 w-4" /> },
      { href: "/admin/produits", label: "Produits publiés", icon: <Package className="h-4 w-4" /> },
      { href: "/admin/marges", label: "Marges commerciales", icon: <Percent className="h-4 w-4" /> },
      { href: "/admin/frais-livraison", label: "Frais de livraison", icon: <Truck className="h-4 w-4" /> },
    ],
  },
  {
    title: "Finances & Gouvernance",
    items: [
      { href: "/admin/paiements", label: "Paiements", icon: <CreditCard className="h-4 w-4" /> },
      { href: "/admin/clients-credit", label: "Crédit Pro B2B", icon: <Briefcase className="h-4 w-4" /> },
      { href: "/admin/reversements", label: "Reversements", icon: <Wallet className="h-4 w-4" /> },
      { href: "/admin/factures", label: "Factures", icon: <FileText className="h-4 w-4" /> },
      { href: "/admin/messages", label: "Messages contact", icon: <Mail className="h-4 w-4" /> },
      { href: "/admin/statistiques", label: "Statistiques", icon: <BarChart3 className="h-4 w-4" /> },
      { href: "/admin/audit", label: "Journal d'audit", icon: <ShieldCheck className="h-4 w-4" /> },
      { href: "/admin/parametres", label: "Paramètres", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["ADMIN"], "/connexion-admin");

  let unreadNotifications = 0;
  try {
    unreadNotifications = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });
  } catch {
    // Non bloquant
  }

  return (
    <PortalShellClient
      portalName="Admin • Vendeur Unique"
      userDisplayName={user.fullName}
      userRoleLabel="Administrateur FoodSupply"
      notificationsHref="/admin/notifications"
      unreadNotifications={unreadNotifications}
      signOutCallbackUrl="/connexion-admin"
      sections={ADMIN_SECTIONS}
    >
      {children}
    </PortalShellClient>
  );
}
