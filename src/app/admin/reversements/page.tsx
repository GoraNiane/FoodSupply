import type { Metadata } from "next";
import { CheckCircle2, Clock, Download, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { StatCard } from "@/components/ui";
import { formatXof } from "@/lib/utils/format";
import {
  AdminSettlementsManager,
  type AdminSettlementRow,
} from "@/components/admin/admin-settlements-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reversements Fournisseurs",
};

export default async function AdminSettlementsPage() {
  const supplierOrders = await prisma.supplierOrder.findMany({
    where: {
      order: {
        status: {
          in: ["PAYEE", "EN_PREPARATION", "PRETE_A_COLLECTER", "EN_COLLECTE", "EN_LIVRAISON", "LIVREE"],
        },
      },
      subtotalSupplierXof: { gt: 0 },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
    include: {
      supplier: { select: { companyName: true, contactPhone: true, payoutMethod: true } },
      order: { select: { id: true, orderNumber: true, status: true } },
      settlement: true,
    },
  });

  const rows: AdminSettlementRow[] = supplierOrders.map((so) => ({
    supplierOrderId: so.id,
    reference: so.reference,
    orderId: so.order.id,
    orderNumber: so.order.orderNumber,
    orderStatus: so.order.status,
    supplierName: so.supplier.companyName,
    supplierPhone: so.supplier.contactPhone,
    payoutMethod: so.settlement?.payoutMethod ?? so.supplier.payoutMethod,
    amountXof: so.subtotalSupplierXof,
    settlementStatus: so.settlement?.status ?? "PENDING",
    settlementRef: so.settlement?.reference ?? null,
    externalTransferRef: so.settlement?.externalTransferRef ?? null,
    paidAt: so.settlement?.paidAt?.toISOString() ?? null,
    createdAt: so.createdAt.toISOString(),
  }));

  const pendingXof = rows
    .filter((r) => r.settlementStatus !== "PAID")
    .reduce((s, r) => s + r.amountXof, 0);
  const paidXof = rows
    .filter((r) => r.settlementStatus === "PAID")
    .reduce((s, r) => s + r.amountXof, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">
            Reversements fournisseurs (Confidentiel Admin)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Suivez les montants d&apos;achat dus à vos partenaires fournisseurs sur les commandes
            payées / livrées et enregistrez vos virements Wave.
          </p>
        </div>
        <a
          href="/api/v1/admin/export?type=settlements"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border bg-white px-4 text-xs font-semibold text-navy-900 hover:bg-surface-muted"
        >
          <Download className="h-4 w-4 text-brand-600" />
          Exporter CSV (Excel)
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Montant restant à reverser"
          value={formatXof(pendingXof)}
          subtitle={`${rows.filter((r) => r.settlementStatus !== "PAID").length} sous-commande(s)`}
          icon={<Clock className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          title="Total déjà reversé"
          value={formatXof(paidXof)}
          subtitle="Payé aux fournisseurs"
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          title="Volume achats total"
          value={formatXof(pendingXof + paidXof)}
          subtitle={`${rows.length} ligne(s)`}
          icon={<Wallet className="h-5 w-5" />}
          accent="navy"
        />
      </div>

      <AdminSettlementsManager rows={rows} />
    </div>
  );
}
