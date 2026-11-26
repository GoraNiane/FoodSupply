import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { AuthorizationError, requireApiPermission } from "@/lib/auth/session";
import { buildFrenchExcelCsv } from "@/lib/utils/csv";
import { formatDateDakar } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireApiPermission("payments:manage:all");
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "orders";
    const dateTag = new Date().toISOString().slice(0, 10);

    let csv = "";
    let filename = `foodsupply-${type}-${dateTag}.csv`;

    if (type === "orders") {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      csv = buildFrenchExcelCsv(
        [
          "Numéro commande",
          "Date (Dakar)",
          "Client",
          "Téléphone",
          "Quartier",
          "Statut",
          "Crédit Pro",
          "Coût achat (XOF)",
          "Sous-total client (XOF)",
          "Marge brute (XOF)",
          "Livraison (XOF)",
          "Total TTC (XOF)",
        ],
        orders.map((o) => {
          const addr = (o.deliveryAddressSnapshot ?? {}) as Record<string, string | undefined>;
          return [
            o.orderNumber,
            formatDateDakar(o.createdAt, true),
            addr.restaurantName || addr.contactName || "",
            addr.phone || o.guestPhone || "",
            addr.neighborhood || "",
            o.status,
            o.isCreditOrder ? "Oui" : "Non",
            o.subtotalSupplierXof,
            o.subtotalClientXof,
            o.marginTotalXof,
            o.deliveryFeeXof,
            o.totalClientXof,
          ];
        })
      );
      filename = `foodsupply-commandes-${dateTag}.csv`;
    } else if (type === "invoices") {
      const invoices = await prisma.invoice.findMany({
        orderBy: { issuedAt: "desc" },
        take: 1000,
        include: { order: { select: { orderNumber: true, deliveryAddressSnapshot: true } } },
      });
      csv = buildFrenchExcelCsv(
        [
          "N° Facture",
          "Commande",
          "Date émission",
          "Client",
          "Sous-total (XOF)",
          "Livraison (XOF)",
          "Total TTC (XOF)",
          "Statut paiement",
        ],
        invoices.map((inv) => {
          const addr = (inv.order.deliveryAddressSnapshot ?? {}) as Record<string, string | undefined>;
          return [
            inv.invoiceNumber,
            inv.order.orderNumber,
            formatDateDakar(inv.issuedAt, true),
            addr.restaurantName || addr.contactName || "",
            inv.subtotalClientXof,
            inv.deliveryFeeXof,
            inv.totalClientXof,
            inv.paymentStatus,
          ];
        })
      );
      filename = `foodsupply-factures-${dateTag}.csv`;
    } else if (type === "payments") {
      const payments = await prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
        include: { order: { select: { orderNumber: true, deliveryAddressSnapshot: true } } },
      });
      csv = buildFrenchExcelCsv(
        [
          "Référence paiement",
          "Commande",
          "Client",
          "Mode",
          "Montant (XOF)",
          "Statut",
          "Réf. transaction Wave/OM",
          "Date paiement",
        ],
        payments.map((p) => {
          const addr = (p.order.deliveryAddressSnapshot ?? {}) as Record<string, string | undefined>;
          return [
            p.reference,
            p.order.orderNumber,
            addr.restaurantName || addr.contactName || "",
            p.method,
            p.amountXof,
            p.status,
            p.providerTransactionId || "",
            p.paidAt ? formatDateDakar(p.paidAt, true) : formatDateDakar(p.createdAt, true),
          ];
        })
      );
      filename = `foodsupply-paiements-${dateTag}.csv`;
    } else if (type === "settlements") {
      const supplierOrders = await prisma.supplierOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
        include: {
          supplier: { select: { companyName: true, contactPhone: true, payoutMethod: true } },
          order: { select: { orderNumber: true, status: true } },
          settlement: true,
        },
      });
      csv = buildFrenchExcelCsv(
        [
          "Réf. sous-commande",
          "Commande client",
          "Statut commande",
          "Fournisseur (confidentiel)",
          "Téléphone fournisseur",
          "Montant à reverser (XOF)",
          "Statut reversement",
          "Réf. virement/Wave",
          "Date reversement",
        ],
        supplierOrders.map((so) => [
          so.reference,
          so.order.orderNumber,
          so.order.status,
          so.supplier.companyName,
          so.supplier.contactPhone,
          so.subtotalSupplierXof,
          so.settlement?.status ?? "PENDING",
          so.settlement?.externalTransferRef ?? "",
          so.settlement?.paidAt ? formatDateDakar(so.settlement.paidAt, true) : "",
        ])
      );
      filename = `foodsupply-reversements-fournisseurs-${dateTag}.csv`;
    } else {
      return NextResponse.json({ error: "Type d'export non supporté." }, { status: 400 });
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur lors de l'export CSV." }, { status: 500 });
  }
}
