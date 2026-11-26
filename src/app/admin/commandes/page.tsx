import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, Download } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import {
  Badge,
  Card,
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
  title: "Commandes clients",
};

const QUICK_FILTERS: Array<{ label: string; status?: OrderStatus }> = [
  { label: "Toutes" },
  { label: "À confirmer", status: "EN_ATTENTE_CONFIRMATION" },
  { label: "Proposition client", status: "PARTIELLEMENT_CONFIRME" },
  { label: "Attente paiement", status: "EN_ATTENTE_PAIEMENT" },
  { label: "Payées", status: "PAYEE" },
  { label: "En livraison", status: "EN_LIVRAISON" },
  { label: "Livrées", status: "LIVREE" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const statusFilter =
    typeof sp.status === "string" && sp.status ? (sp.status as OrderStatus) : undefined;

  let orders: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    isGuestOrder: boolean;
    guestRestaurantName: string | null;
    guestPhone: string | null;
    totalClientXof: number;
    marginTotalXof: number;
    createdAt: Date;
    restaurant: { businessName: string } | null;
    _count: { items: number };
  }> = [];

  try {
    orders = await prisma.order.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        restaurant: { select: { businessName: true } },
        _count: { select: { items: true } },
      },
    });
  } catch {
    orders = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Commandes clients</h1>
          <p className="mt-1 text-sm text-slate-600">
            Confirmez les stocks et prix avant paiement, puis pilotez la préparation et la livraison.
          </p>
        </div>
        <a
          href="/api/v1/admin/export?type=orders"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border bg-white px-4 text-xs font-semibold text-navy-900 hover:bg-surface-muted"
        >
          <Download className="h-4 w-4 text-brand-600" />
          Exporter CSV (Excel)
        </a>
      </div>

      <Card className="flex flex-wrap gap-2 p-4">
        {QUICK_FILTERS.map((f) => {
          const active = statusFilter === f.status;
          return (
            <Link
              key={f.label}
              href={f.status ? `/admin/commandes?status=${f.status}` : "/admin/commandes"}
              className={buttonVariants({
                variant: active ? "navy" : "outline",
                size: "sm",
              })}
            >
              {f.label}
            </Link>
          );
        })}
      </Card>

      {orders.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Référence</TableHeaderCell>
                <TableHeaderCell>Client / Restaurant</TableHeaderCell>
                <TableHeaderCell>Articles</TableHeaderCell>
                <TableHeaderCell>Total client</TableHeaderCell>
                <TableHeaderCell>Marge brute</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
                <TableHeaderCell className="text-right">Action</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <p className="font-bold text-navy-900">{order.orderNumber}</p>
                    <p className="text-xs text-slate-500">{formatDateDakar(order.createdAt, true)}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-navy-900">
                      {order.restaurant?.businessName || order.guestRestaurantName || "Client Dakar"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge variant={order.isGuestOrder ? "warning" : "navy"}>
                        {order.isGuestOrder ? "Invité" : "Inscrit"}
                      </Badge>
                      {order.guestPhone && (
                        <span className="text-xs text-slate-500">{order.guestPhone}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{order._count.items}</TableCell>
                  <TableCell className="font-bold">{formatXof(order.totalClientXof)}</TableCell>
                  <TableCell className="font-semibold text-success-600">
                    +{formatXof(order.marginTotalXof)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/commandes/${order.id}`}
                      className={buttonVariants({ variant: "primary", size: "sm" })}
                    >
                      Traiter
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
          title="Aucune commande dans cette vue"
          description="Les commandes soumises par vos clients (avec ou sans compte) apparaîtront ici dès réception."
        />
      )}
    </div>
  );
}
