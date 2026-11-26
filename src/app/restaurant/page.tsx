import Link from "next/link";
import { ClipboardList, CreditCard, ShoppingBag, Truck } from "lucide-react";
import { Card, StatCard, buttonVariants } from "@/components/ui";
import { requirePageRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { formatXof } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function RestaurantDashboardPage() {
  const user = await requirePageRole(["RESTAURANT"], "/connexion");

  let ordersCount = 0;
  let inProgressCount = 0;
  let totalSpentXof = 0;

  if (user.restaurantId) {
    try {
      const [total, inProgress, spent] = await Promise.all([
        prisma.order.count({ where: { restaurantId: user.restaurantId } }),
        prisma.order.count({
          where: {
            restaurantId: user.restaurantId,
            status: {
              in: [
                "EN_ATTENTE_CONFIRMATION",
                "PARTIELLEMENT_CONFIRME",
                "EN_ATTENTE_PAIEMENT",
                "PAYEE",
                "EN_PREPARATION",
                "EN_COLLECTE",
                "EN_LIVRAISON",
              ],
            },
          },
        }),
        prisma.order.aggregate({
          where: {
            restaurantId: user.restaurantId,
            status: { in: ["PAYEE", "EN_PREPARATION", "EN_COLLECTE", "EN_LIVRAISON", "LIVREE"] },
          },
          _sum: { totalClientXof: true },
        }),
      ]);
      ordersCount = total;
      inProgressCount = inProgress;
      totalSpentXof = spent._sum.totalClientXof ?? 0;
    } catch {
      // Base non initialisée
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Bonjour, {user.fullName}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Retrouvez ici votre historique de commandes, vos dépenses et vos factures FoodSupply.
          </p>
        </div>
        <Link href="/catalogue" className={buttonVariants({ variant: "primary" })}>
          <ShoppingBag className="h-4 w-4" />
          Nouvelle commande
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Commandes passées"
          value={ordersCount}
          icon={<ClipboardList className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          title="Dépenses totales"
          value={formatXof(totalSpentXof)}
          icon={<CreditCard className="h-5 w-5" />}
          accent="brand"
        />
        <StatCard
          title="Commandes en cours"
          value={inProgressCount}
          icon={<Truck className="h-5 w-5" />}
          accent="success"
        />
      </div>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-navy-900">Compte client connecté</h2>
        <p className="mt-1 text-sm text-slate-600">
          Vos accès sont strictement isolés sur votre établissement. Les fonctionnalités panier
          persistant, suivi temps réel et factures PDF seront activées dès les prochaines phases.
        </p>
      </Card>
    </div>
  );
}
