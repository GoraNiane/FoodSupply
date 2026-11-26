import type { Metadata } from "next";
import { CreditCard, Clock, CheckCircle2, Download, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { StatCard } from "@/components/ui";
import { formatXof } from "@/lib/utils/format";
import {
  AdminPaymentsManager,
  type AdminPaymentRow,
  type AwaitingOrderRow,
} from "@/components/admin/admin-payments-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Paiements Wave & Encaissements",
};

export default async function AdminPaymentsPage() {
  const [payments, awaitingOrders] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            deliveryAddressSnapshot: true,
          },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        status: "EN_ATTENTE_PAIEMENT",
        payments: { none: { status: { in: ["PENDING", "INITIATED", "SUCCEEDED"] } } },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        totalClientXof: true,
        createdAt: true,
        deliveryAddressSnapshot: true,
      },
    }),
  ]);

  const totalSucceededXof = payments
    .filter((p) => p.status === "SUCCEEDED")
    .reduce((sum, p) => sum + p.amountXof, 0);
  const pendingCount =
    payments.filter((p) => p.status === "PENDING" || p.status === "INITIATED").length +
    awaitingOrders.length;
  const waveCount = payments.filter((p) => p.method === "WAVE" && p.status === "SUCCEEDED").length;
  const refundedXof = payments
    .filter((p) => p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED")
    .reduce((sum, p) => sum + p.amountXof, 0);

  const paymentRows: AdminPaymentRow[] = payments.map((p) => {
    const addr = (p.order.deliveryAddressSnapshot ?? {}) as {
      restaurantName?: string;
      contactName?: string;
    };
    const meta = (p.metadata ?? {}) as {
      clientDeclaredPaid?: boolean;
      clientDeclarationRef?: string | null;
    };
    return {
      id: p.id,
      reference: p.reference,
      orderId: p.orderId,
      orderNumber: p.order.orderNumber,
      clientLabel: addr.restaurantName || addr.contactName || "Client FoodSupply",
      method: p.method,
      status: p.status,
      amountXof: p.amountXof,
      providerTransactionId: p.providerTransactionId,
      clientDeclaredPaid: Boolean(meta.clientDeclaredPaid),
      clientDeclarationRef: meta.clientDeclarationRef ?? null,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    };
  });

  const awaitingRows: AwaitingOrderRow[] = awaitingOrders.map((ord) => {
    const addr = (ord.deliveryAddressSnapshot ?? {}) as {
      restaurantName?: string;
      contactName?: string;
    };
    return {
      id: ord.id,
      orderNumber: ord.orderNumber,
      clientLabel: addr.restaurantName || addr.contactName || "Client FoodSupply",
      totalClientXof: ord.totalClientXof,
      createdAt: ord.createdAt.toISOString(),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Paiements & Encaissements Wave</h1>
          <p className="mt-1 text-sm text-slate-600">
            Vérifiez les règlements Wave reçus sur votre lien marchand FoodSupply, validez les
            commandes et gérez les remboursements.
          </p>
        </div>
        <a
          href="/api/v1/admin/export?type=payments"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border bg-white px-4 text-xs font-semibold text-navy-900 hover:bg-surface-muted"
        >
          <Download className="h-4 w-4 text-brand-600" />
          Exporter CSV (Excel)
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total encaissé"
          value={formatXof(totalSucceededXof)}
          subtitle="Paiements confirmés"
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          title="En attente de validation"
          value={pendingCount}
          subtitle="À vérifier sur Wave"
          icon={<Clock className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          title="Encaissements Wave"
          value={waveCount}
          subtitle="Transactions Wave validées"
          icon={<CreditCard className="h-5 w-5" />}
          accent="brand"
        />
        <StatCard
          title="Montants remboursés"
          value={formatXof(refundedXof)}
          subtitle="Remboursements effectués"
          icon={<RotateCcw className="h-5 w-5" />}
          accent="navy"
        />
      </div>

      <AdminPaymentsManager
        payments={paymentRows}
        awaitingOrdersWithoutPayment={awaitingRows}
      />
    </div>
  );
}
