import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import {
  Badge,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { formatDateDakar, formatXof } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Factures clients PDF",
};

export default async function AdminInvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { issuedAt: "desc" },
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
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Factures clients (PDF)</h1>
          <p className="mt-1 text-sm text-slate-600">
            Factures officielles générées automatiquement à la validation de chaque paiement client
            (aucune donnée fournisseur n&apos;y figure).
          </p>
        </div>
        <a
          href="/api/v1/admin/export?type=invoices"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border bg-white px-4 text-xs font-semibold text-navy-900 hover:bg-surface-muted"
        >
          <Download className="h-4 w-4 text-brand-600" />
          Exporter CSV (Excel)
        </a>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Aucune facture générée"
          description="Une facture PDF numérotée est créée automatiquement dès qu'un paiement est validé."
        />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>N° Facture</TableHeaderCell>
                <TableHeaderCell>Commande</TableHeaderCell>
                <TableHeaderCell>Client</TableHeaderCell>
                <TableHeaderCell>Sous-total</TableHeaderCell>
                <TableHeaderCell>Livraison</TableHeaderCell>
                <TableHeaderCell>Total TTC</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
                <TableHeaderCell>Date d&apos;émission</TableHeaderCell>
                <TableHeaderCell className="text-right">PDF</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((inv) => {
                const addr = (inv.order.deliveryAddressSnapshot ?? {}) as {
                  restaurantName?: string;
                  contactName?: string;
                };
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-bold text-navy-900">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/commandes/${inv.order.id}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {inv.order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {addr.restaurantName || addr.contactName || "Client FoodSupply"}
                    </TableCell>
                    <TableCell>{formatXof(inv.subtotalClientXof)}</TableCell>
                    <TableCell>{formatXof(inv.deliveryFeeXof)}</TableCell>
                    <TableCell className="font-bold text-navy-900">
                      {formatXof(inv.totalClientXof)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          inv.paymentStatus === "PAID"
                            ? "success"
                            : inv.paymentStatus === "REFUNDED"
                              ? "brand"
                              : "warning"
                        }
                      >
                        {inv.paymentStatus === "PAID"
                          ? "Payée"
                          : inv.paymentStatus === "REFUNDED"
                            ? "Remboursée"
                            : "Impayée"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDateDakar(inv.issuedAt, true)}
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`/api/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Télécharger
                      </a>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
