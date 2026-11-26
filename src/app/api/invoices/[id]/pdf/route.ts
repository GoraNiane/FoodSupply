import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getVerifiedSessionUser } from "@/lib/auth/session";
import { canAccessOrder } from "@/lib/permissions/rbac";
import { generateInvoicePdfBytes } from "@/modules/invoices/pdf-generator";
import { getCompanyProfile } from "@/modules/payments/settings";
import type { CompanyProfileConfig } from "@/modules/payments/wave";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const guestToken = url.searchParams.get("token");
    const actor = await getVerifiedSessionUser();

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: { orderBy: { createdAt: "asc" } },
            delivery: true,
            payments: { where: { status: "SUCCEEDED" }, take: 1 },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    }

    const allowed = canAccessOrder({
      order: {
        restaurantId: invoice.order.restaurantId,
        isGuestOrder: invoice.order.isGuestOrder,
        guestTrackingTokenHash: invoice.order.guestTrackingTokenHash,
        assignedDriverId: invoice.order.delivery?.driverId ?? null,
      },
      actor,
      guestToken,
    });

    if (!allowed) {
      return NextResponse.json({ error: "Accès refusé à cette facture." }, { status: 403 });
    }

    const snapshot = (invoice.snapshotJson ?? {}) as {
      company?: CompanyProfileConfig;
      paymentMethod?: string;
      clientAddress?: Record<string, string | null | undefined>;
      items?: Array<{
        productName: string;
        unitLabel: string;
        quantity: number;
        unitPriceXof: number;
        lineTotalXof: number;
      }>;
    };

    const company = snapshot.company ?? (await getCompanyProfile());
    const clientAddr = (snapshot.clientAddress ??
      invoice.order.deliveryAddressSnapshot ??
      {}) as Record<string, string | null | undefined>;

    const items =
      snapshot.items && snapshot.items.length > 0
        ? snapshot.items
        : invoice.order.items
            .filter((i) => (i.confirmedQty ?? i.requestedQty) > 0)
            .map((i) => ({
              productName: i.productNameSnapshot,
              unitLabel: i.unitLabelSnapshot,
              quantity: i.confirmedQty ?? i.requestedQty,
              unitPriceXof: i.clientUnitPriceXof,
              lineTotalXof: i.lineClientTotalXof,
            }));

    const pdfBytes = await generateInvoicePdfBytes({
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: invoice.order.orderNumber,
      issuedAt: invoice.issuedAt,
      paymentStatus: invoice.paymentStatus,
      paymentMethod: snapshot.paymentMethod ?? "Wave Sénégal",
      currency: invoice.currency,
      subtotalClientXof: invoice.subtotalClientXof,
      deliveryFeeXof: invoice.deliveryFeeXof,
      totalClientXof: invoice.totalClientXof,
      company,
      client: {
        restaurantName: clientAddr.restaurantName ?? undefined,
        contactName: clientAddr.contactName ?? undefined,
        phone: clientAddr.phone ?? undefined,
        email: clientAddr.email ?? undefined,
        street: clientAddr.street ?? undefined,
        neighborhood: clientAddr.neighborhood ?? undefined,
        landmark: clientAddr.landmark ?? undefined,
      },
      items,
    });

    const safeFileName = invoice.invoiceNumber.replace(/[^A-Za-z0-9_-]/g, "");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFileName}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la génération de la facture PDF." },
      { status: 500 }
    );
  }
}
