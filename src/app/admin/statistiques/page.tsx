import type { Metadata } from "next";
import { BarChart3, CreditCard, Package, TrendingUp } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import {
  Card,
  OrderStatusBadge,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { formatXof } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Statistiques & Rentabilité",
};

const PAID_STATUSES: OrderStatus[] = [
  "PAYEE",
  "EN_PREPARATION",
  "PRETE_A_COLLECTER",
  "EN_COLLECTE",
  "EN_LIVRAISON",
  "LIVREE",
];

export default async function AdminStatsPage() {
  const [paidAgg, totalOrdersCount, ordersByStatus, topItems, activeProductsCount] =
    await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: PAID_STATUSES } },
        _count: { id: true },
        _sum: {
          totalClientXof: true,
          subtotalClientXof: true,
          subtotalSupplierXof: true,
          marginTotalXof: true,
          deliveryFeeXof: true,
        },
      }),
      prisma.order.count(),
      prisma.order.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { totalClientXof: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productNameSnapshot"],
        where: { order: { status: { in: PAID_STATUSES } } },
        _sum: { lineClientTotalXof: true, lineMarginXof: true, confirmedQty: true },
        orderBy: { _sum: { lineClientTotalXof: "desc" } },
        take: 10,
      }),
      prisma.product.count({ where: { isActive: true } }),
    ]);

  const paidCount = paidAgg._count.id;
  const revenueXof = paidAgg._sum.totalClientXof ?? 0;
  const productsSubXof = paidAgg._sum.subtotalClientXof ?? 0;
  const marginXof = paidAgg._sum.marginTotalXof ?? 0;
  const deliveryXof = paidAgg._sum.deliveryFeeXof ?? 0;
  const avgBasketXof = paidCount > 0 ? Math.round(revenueXof / paidCount) : 0;
  const marginRatePct =
    productsSubXof > 0 ? ((marginXof / productsSubXof) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Statistiques commerciales (Temps réel)</h1>
        <p className="mt-1 text-sm text-slate-600">
          Chiffres calculés exclusivement depuis vos commandes réelles enregistrées en base TiDB.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chiffre d'affaires encaissé"
          value={formatXof(revenueXof)}
          subtitle={`${paidCount} commande(s) payée(s)`}
          icon={<CreditCard className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          title="Marge brute commerciale"
          value={formatXof(marginXof)}
          subtitle={`Taux moyen : ${marginRatePct} %`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="brand"
        />
        <StatCard
          title="Panier moyen payé"
          value={formatXof(avgBasketXof)}
          subtitle={`Frais livraison cumulés : ${formatXof(deliveryXof)}`}
          icon={<BarChart3 className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          title="Volume commandes / Catalogue"
          value={`${totalOrdersCount} cmd`}
          subtitle={`${activeProductsCount} produit(s) publié(s)`}
          icon={<Package className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-5">
          <h2 className="text-base font-bold text-navy-900">Répartition des commandes par statut</h2>
          {ordersByStatus.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucune commande enregistrée pour le moment.</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {ordersByStatus.map((row) => (
                <div
                  key={row.status}
                  className="flex items-center justify-between rounded-xl border border-surface-border px-3.5 py-2.5 text-sm"
                >
                  <OrderStatusBadge status={row.status} />
                  <div className="text-right">
                    <span className="font-bold text-navy-900">{row._count.id}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      ({formatXof(row._sum.totalClientXof ?? 0)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="lg:col-span-7">
          <Card className="p-6">
            <h2 className="mb-4 text-base font-bold text-navy-900">
              Top produits vendus (commandes payées)
            </h2>
            {topItems.length === 0 ? (
              <p className="text-sm text-slate-500">
                Les meilleures ventes s&apos;afficheront automatiquement dès les premières commandes
                payées.
              </p>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Produit</TableHeaderCell>
                      <TableHeaderCell>Qté vendue</TableHeaderCell>
                      <TableHeaderCell>CA Client</TableHeaderCell>
                      <TableHeaderCell className="text-right">Marge brute</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topItems.map((item) => (
                      <TableRow key={item.productNameSnapshot}>
                        <TableCell className="font-semibold text-navy-900">
                          {item.productNameSnapshot}
                        </TableCell>
                        <TableCell>{item._sum.confirmedQty ?? 0}</TableCell>
                        <TableCell className="font-semibold">
                          {formatXof(item._sum.lineClientTotalXof ?? 0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-success-600">
                          +{formatXof(item._sum.lineMarginXof ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
