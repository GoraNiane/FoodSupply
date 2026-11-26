import Link from "next/link";
import {
  Building2,
  ClipboardList,
  CreditCard,
  FolderTree,
  Inbox,
  Package,
  Percent,
  Truck,
} from "lucide-react";
import { Card, StatCard, buttonVariants } from "@/components/ui";
import { prisma } from "@/lib/prisma/client";
import { formatXof } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let pendingOrders = 0;
  let pendingSubmissions = 0;
  let totalSuppliers = 0;
  let totalRevenueXof = 0;
  let totalMarginXof = 0;

  try {
    const [pendingCount, subCount, supCount, paidAgg] = await Promise.all([
      prisma.order.count({
        where: { status: { in: ["EN_ATTENTE_CONFIRMATION", "PARTIELLEMENT_CONFIRME"] } },
      }),
      prisma.supplierProductSubmission.count({
        where: { status: { in: ["EN_ATTENTE_VALIDATION", "EN_COURS_EXAMEN"] } },
      }),
      prisma.supplier.count(),
      prisma.order.aggregate({
        where: {
          status: {
            in: ["PAYEE", "EN_PREPARATION", "PRETE_A_COLLECTER", "EN_COLLECTE", "EN_LIVRAISON", "LIVREE"],
          },
        },
        _sum: { totalClientXof: true, marginTotalXof: true },
      }),
    ]);

    pendingOrders = pendingCount;
    pendingSubmissions = subCount;
    totalSuppliers = supCount;
    totalRevenueXof = paidAgg._sum.totalClientXof ?? 0;
    totalMarginXof = paidAgg._sum.marginTotalXof ?? 0;
  } catch {
    // Base en attente
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Tableau de bord Administration FoodSupply</h1>
          <p className="mt-1 text-sm text-slate-600">
            Contrôle total sur vos fournisseurs en coulisses, les propositions produits, votre
            catalogue public et les commandes clients sans compte.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/propositions" className={buttonVariants({ variant: "primary" })}>
            <Inbox className="h-4 w-4" />
            Propositions ({pendingSubmissions})
          </Link>
          <Link href="/admin/produits" className={buttonVariants({ variant: "navy" })}>
            <Package className="h-4 w-4" />
            Catalogue publié
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chiffre d'affaires encaissé"
          value={formatXof(totalRevenueXof)}
          subtitle={`Marge brute : +${formatXof(totalMarginXof)}`}
          icon={<CreditCard className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          title="Propositions à examiner"
          value={pendingSubmissions}
          subtitle="Soumises par les fournisseurs"
          icon={<Inbox className="h-5 w-5" />}
          accent="brand"
        />
        <StatCard
          title="Commandes à confirmer"
          value={pendingOrders}
          subtitle="Validation stock & prix"
          icon={<ClipboardList className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          title="Fournisseurs inscrits"
          value={totalSuppliers}
          subtitle="Confidentiels (coulisses)"
          icon={<Building2 className="h-5 w-5" />}
          accent="navy"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: "/admin/propositions",
            icon: <Inbox className="h-5 w-5 text-brand-600" />,
            title: "Propositions fournisseurs",
            desc: "Examiner, négocier et publier au catalogue",
          },
          {
            href: "/admin/fournisseurs",
            icon: <Building2 className="h-5 w-5 text-navy-700" />,
            title: "Fournisseurs inscrits",
            desc: "Contacts privés, validation et suspension",
          },
          {
            href: "/admin/produits",
            icon: <Package className="h-5 w-5 text-brand-600" />,
            title: "Catalogue public",
            desc: "Prix clients FCFA, photos et stocks",
          },
          {
            href: "/admin/categories",
            icon: <FolderTree className="h-5 w-5 text-navy-700" />,
            title: "Catégories",
            desc: "Rayons & marges par catégorie",
          },
          {
            href: "/admin/marges",
            icon: <Percent className="h-5 w-5 text-success-600" />,
            title: "Marges commerciales",
            desc: "Marge par défaut & simulateur FCFA",
          },
          {
            href: "/admin/frais-livraison",
            icon: <Truck className="h-5 w-5 text-navy-700" />,
            title: "Frais de livraison",
            desc: "Tarifs Dakar, froid, fragile & gratuité",
          },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-elevated">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-subtle">
                {action.icon}
              </div>
              <h2 className="mt-3 text-sm font-bold text-ink-900">{action.title}</h2>
              <p className="mt-1 text-xs text-slate-500">{action.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
