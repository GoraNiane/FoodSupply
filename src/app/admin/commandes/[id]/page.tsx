import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import {
  AdminOrderDetailClient,
  type AdminOrderDetailView,
} from "@/components/admin/admin-order-detail-client";
import { getPaymentConfig } from "@/modules/payments/settings";
import { buildWavePaymentUrl } from "@/modules/payments/wave";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Détail commande",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [paymentConfig, order] = await Promise.all([
    getPaymentConfig(),
    prisma.order.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        delivery: true,
        invoice: true,
        payments: { orderBy: { createdAt: "desc" } },
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    }),
  ]);

  if (!order) {
    notFound();
  }

  const addr = (order.deliveryAddressSnapshot ?? {}) as AdminOrderDetailView["address"];
  const wavePaymentUrl =
    order.totalClientXof > 0
      ? buildWavePaymentUrl(order.totalClientXof, paymentConfig.waveMerchantBaseUrl)
      : null;

  const view: AdminOrderDetailView = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    isGuestOrder: order.isGuestOrder,
    isCreditOrder: order.isCreditOrder,
    paymentDueAt: order.paymentDueAt?.toISOString() ?? null,
    wavePaymentUrl,
    createdAt: order.createdAt.toISOString(),
    subtotalSupplierXof: order.subtotalSupplierXof,
    subtotalClientXof: order.subtotalClientXof,
    marginTotalXof: order.marginTotalXof,
    deliveryFeeXof: order.deliveryFeeXof,
    totalClientXof: order.totalClientXof,
    notes: order.notes,
    address: addr,
    invoice: order.invoice
      ? {
          id: order.invoice.id,
          invoiceNumber: order.invoice.invoiceNumber,
          paymentStatus: order.invoice.paymentStatus,
        }
      : null,
    payments: order.payments.map((p) => {
      const meta = (p.metadata ?? {}) as {
        clientDeclaredPaid?: boolean;
        clientDeclarationRef?: string | null;
        payerPhone?: string | null;
      };
      return {
        id: p.id,
        reference: p.reference,
        method: p.method,
        status: p.status,
        amountXof: p.amountXof,
        providerTransactionId: p.providerTransactionId,
        paidAt: p.paidAt?.toISOString() ?? null,
        clientDeclaredPaid: Boolean(meta.clientDeclaredPaid),
        clientDeclarationRef: meta.clientDeclarationRef ?? null,
        payerPhone: meta.payerPhone ?? null,
      };
    }),
    delivery: order.delivery
      ? {
          externalDriverName: order.delivery.externalDriverName,
          externalDriverPhone: order.delivery.externalDriverPhone,
          requiresColdChain: order.delivery.requiresColdChain,
          hasFragileItems: order.delivery.hasFragileItems,
        }
      : null,
    items: order.items.map((i) => ({
      id: i.id,
      productName: i.productNameSnapshot,
      unitLabel: i.unitLabelSnapshot,
      requestedQty: i.requestedQty,
      confirmedQty: i.confirmedQty,
      requestedSupplierPriceXof: i.requestedSupplierPriceXof,
      confirmedSupplierPriceXof: i.confirmedSupplierPriceXof,
      clientUnitPriceXof: i.clientUnitPriceXof,
      itemStatus: i.itemStatus,
    })),
    history: order.statusHistory.map((h) => ({
      id: h.id,
      toStatus: h.toStatus,
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-4">
      <Link
        href="/admin/commandes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux commandes
      </Link>
      <AdminOrderDetailClient order={view} />
    </div>
  );
}
