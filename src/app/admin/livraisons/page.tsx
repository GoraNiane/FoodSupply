import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Snowflake, ShieldAlert, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import {
  Badge,
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
import { formatDateDakar } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suivi livraisons",
};

export default async function AdminDeliveriesPage() {
  let orders: Array<{
    id: string;
    orderNumber: string;
    status: "PAYEE" | "EN_PREPARATION" | "PRETE_A_COLLECTER" | "EN_COLLECTE" | "EN_LIVRAISON" | "LIVREE";
    guestRestaurantName: string | null;
    deliveryAddressSnapshot: unknown;
    updatedAt: Date;
    delivery: {
      externalDriverName: string | null;
      externalDriverPhone: string | null;
      requiresColdChain: boolean;
      hasFragileItems: boolean;
    } | null;
  }> = [];

  try {
    const rows = await prisma.order.findMany({
      where: {
        status: {
          in: ["PAYEE", "EN_PREPARATION", "PRETE_A_COLLECTER", "EN_COLLECTE", "EN_LIVRAISON", "LIVREE"],
        },
      },
      orderBy: { updatedAt: "desc" },
      include: { delivery: true },
    });
    orders = rows as typeof orders;
  } catch {
    orders = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Suivi des livraisons Dakar</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gérez vos expéditions et renseignez librement les coordonnées du livreur externe sur
          chaque commande.
        </p>
      </div>

      {orders.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Commande</TableHeaderCell>
                <TableHeaderCell>Destination Dakar</TableHeaderCell>
                <TableHeaderCell>Contraintes</TableHeaderCell>
                <TableHeaderCell>Livreur externe</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
                <TableHeaderCell className="text-right">Action</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => {
                const addr = (order.deliveryAddressSnapshot ?? {}) as {
                  restaurantName?: string;
                  neighborhood?: string;
                };
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <p className="font-bold text-navy-900">{order.orderNumber}</p>
                      <p className="text-xs text-slate-500">{formatDateDakar(order.updatedAt, true)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-navy-900">
                        {addr.restaurantName || order.guestRestaurantName || "Client"}
                      </p>
                      <p className="text-xs text-slate-500">{addr.neighborhood || "Dakar"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {order.delivery?.requiresColdChain && (
                          <Badge variant="info">
                            <Snowflake className="h-3 w-3" />
                            Froid
                          </Badge>
                        )}
                        {order.delivery?.hasFragileItems && (
                          <Badge variant="warning">
                            <ShieldAlert className="h-3 w-3" />
                            Fragile
                          </Badge>
                        )}
                        {!order.delivery?.requiresColdChain && !order.delivery?.hasFragileItems && (
                          <span className="text-xs text-slate-400">Standard</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.delivery?.externalDriverName ? (
                        <div>
                          <p className="font-medium text-navy-900">
                            {order.delivery.externalDriverName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {order.delivery.externalDriverPhone}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Non renseigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/commandes/${order.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Mettre à jour
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState
          icon={<Truck className="h-7 w-7" />}
          title="Aucune livraison en cours"
          description="Dès qu'une commande est payée ou en préparation, elle apparaîtra ici pour suivi."
        />
      )}
    </div>
  );
}
