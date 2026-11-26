import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { requirePageRole } from "@/lib/auth/session";
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
  buttonVariants,
} from "@/components/ui";
import { formatDateDakar, formatXof } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mes factures PDF",
};

export default async function RestaurantInvoicesPage() {
  const user = await requirePageRole(["RESTAURANT"], "/connexion");

  const invoices = user.restaurantId
    ? await prisma.invoice.findMany({
        where: { restaurantId: user.restaurantId },
        orderBy: { issuedAt: "desc" },
        include: { order: { select: { orderNumber: true } } },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Mes factures FoodSupply</h1>
        <p className="mt-1 text-sm text-slate-600">
          Retrouvez et téléchargez toutes vos factures officielles au format PDF.
        </p>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Aucune facture disponible"
          description="Vos factures PDF s'affichent automatiquement dès que vos commandes sont validées."
          action={
            <Link href="/catalogue" className={buttonVariants({ variant: "primary" })}>
              Parcourir le catalogue
            </Link>
          }
        />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>N° Facture</TableHeaderCell>
                <TableHeaderCell>Commande</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Total TTC</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
                <TableHeaderCell className="text-right">PDF</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs font-bold text-navy-900">
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/suivi/${encodeURIComponent(inv.order.orderNumber)}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {inv.order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDateDakar(inv.issuedAt, false)}
                  </TableCell>
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
                          : "À régler"}
                    </Badge>
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
