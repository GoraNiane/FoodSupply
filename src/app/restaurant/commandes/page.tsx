import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { requirePageRole } from "@/lib/auth/session";
import {
  EmptyState,
  OrderStatusBadge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  buttonVariants,
} from "@/components/ui";
import { formatDateDakar, formatXof } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mes commandes",
};

export default async function RestaurantOrdersPage() {
  const user = await requirePageRole(["RESTAURANT"], "/connexion");

  const orders = user.restaurantId
    ? await prisma.order.findMany({
        where: { restaurantId: user.restaurantId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { items: true } } },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Mes commandes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Consultez l&apos;avancement de vos commandes, validez les propositions et suivez vos
            livraisons.
          </p>
        </div>
        <Link href="/catalogue" className={buttonVariants({ variant: "primary" })}>
          Nouvelle commande
        </Link>
      </div>

      {orders.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Référence</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Articles</TableHeaderCell>
                <TableHeaderCell>Montant total</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
                <TableHeaderCell className="text-right">Suivi</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-bold">{order.orderNumber}</TableCell>
                  <TableCell>{formatDateDakar(order.createdAt, true)}</TableCell>
                  <TableCell>{order._count.items}</TableCell>
                  <TableCell className="font-semibold">{formatXof(order.totalClientXof)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/suivi/${order.orderNumber}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Détail
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" />}
          title="Aucune commande enregistrée"
          description="Commencez vos achats dans le catalogue FoodSupply pour passer votre première commande."
          action={
            <Link href="/catalogue" className={buttonVariants({ variant: "primary" })}>
              Voir le catalogue
            </Link>
          }
        />
      )}
    </div>
  );
}
